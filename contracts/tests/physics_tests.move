#[test_only]
module spinforge::physics_tests {
    use std::string;
    use sui::test_scenario;
    use spinforge::blade;
    use spinforge::ratchet;
    use spinforge::bit;
    use spinforge::physics;

    #[test]
    fun test_prong_multiplier() {
        assert!(physics::prong_multiplier(0) == 100);
        assert!(physics::prong_multiplier(1) == 110);
        assert!(physics::prong_multiplier(5) == 150);
        assert!(physics::prong_multiplier(9) == 190);
    }

    #[test]
    fun test_compute_angular_momentum() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        // Ratchet: 3 prongs, 60 height, weight=100, burst_res=200
        let ratchet = ratchet::mint(3, 60, 100, 200, 0, ctx);
        // Bit: friction=50
        let bit = bit::mint(
            string::utf8(b"Rush"), 0, 50, 3, 0, false, 0, ctx,
        );

        let launch_power: u16 = 100;
        let am = physics::compute_angular_momentum(&ratchet, &bit, launch_power);

        // inertia = 100 * 130 (3 prongs) = 13000
        // efficiency = 100 - 50 = 50
        // am = 13000 * 50 * 100 / 10000 = 6500
        assert!(am == 6500);

        ratchet::destroy_for_testing(ratchet);
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_compute_angular_momentum_low_friction() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(5, 70, 150, 300, 0, ctx);
        let bit = bit::mint(
            string::utf8(b"Needle"), 2, 5, 1, 0, false, 0, ctx,
        );

        let am = physics::compute_angular_momentum(&ratchet, &bit, 100);
        // inertia = 150 * 150 = 22500
        // efficiency = 100 - 5 = 95
        // am = 22500 * 95 * 100 / 10000 = 21375
        assert!(am == 21375, 0);

        ratchet::destroy_for_testing(ratchet);
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_compute_damage() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let atk_blade = blade::mint(
            string::utf8(b"Attacker"), 0, 0, 0, 50, 30, 0, ctx,
        );
        let def_blade = blade::mint(
            string::utf8(b"Defender"), 2, 1, 0, 30, 20, 0, ctx,
        );

        let atk_am: u64 = 10000;
        let type_bonus: u16 = 100; // neutral
        let element_bonus: u16 = 100; // neutral
        let random_variance: u16 = 100; // no variance

        let (dmg, recoil) = physics::compute_damage(
            &atk_blade, atk_am, &def_blade,
            type_bonus, element_bonus, random_variance,
        );

        // raw = 50 * 10000 / 1000 = 500
        // dmg = 500 * 100 * 100 * 100 / 1_000_000 = 500
        assert!(dmg == 500);
        // recoil = 500 * 30 / 100 = 150
        assert!(recoil == 150);

        blade::destroy_for_testing(atk_blade);
        blade::destroy_for_testing(def_blade);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_compute_damage_with_type_bonus() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let atk_blade = blade::mint(
            string::utf8(b"ATK"), 0, 0, 0, 80, 40, 0, ctx,
        );
        let def_blade = blade::mint(
            string::utf8(b"DEF"), 2, 2, 0, 30, 20, 0, ctx,
        );

        // ATK vs STA: +30% type bonus
        let (dmg, _recoil) = physics::compute_damage(
            &atk_blade, 10000, &def_blade,
            130, // ATK>STA bonus
            100,
            100,
        );

        // raw = 80 * 10000 / 1000 = 800
        // dmg = 800 * 130 * 100 * 100 / 1_000_000 = 1040
        assert!(dmg == 1040);

        blade::destroy_for_testing(atk_blade);
        blade::destroy_for_testing(def_blade);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_spin_steal_opposite_directions() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let atk_blade = blade::mint(
            string::utf8(b"Right Spin"), 0, 0, 0, 50, 30, 0, ctx,
        );
        let def_blade = blade::mint(
            string::utf8(b"Left Spin"), 1, 0, 1, 50, 30, 0, ctx, // Left spin
        );

        let steal = physics::compute_spin_steal(&atk_blade, &def_blade, 1000);
        assert!(steal == 100); // 10% of 1000

        blade::destroy_for_testing(atk_blade);
        blade::destroy_for_testing(def_blade);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_spin_steal_same_direction() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let atk_blade = blade::mint(
            string::utf8(b"Right1"), 0, 0, 0, 50, 30, 0, ctx,
        );
        let def_blade = blade::mint(
            string::utf8(b"Right2"), 1, 0, 0, 50, 30, 0, ctx, // Same direction
        );

        let steal = physics::compute_spin_steal(&atk_blade, &def_blade, 1000);
        assert!(steal == 0);

        blade::destroy_for_testing(atk_blade);
        blade::destroy_for_testing(def_blade);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_type_advantage_matrix() {
        // ATK > STA: +30%
        assert!(physics::type_advantage(0, 2) == 130);
        // STA > DEF: +20%
        assert!(physics::type_advantage(2, 1) == 120);
        // DEF > ATK: +40% (recoil reflect)
        assert!(physics::type_advantage(1, 0) == 140);
        // BAL attacks: +10%
        assert!(physics::type_advantage(3, 0) == 110);
        assert!(physics::type_advantage(3, 1) == 110);
        assert!(physics::type_advantage(3, 2) == 110);
        // Attacking BAL: -10%
        assert!(physics::type_advantage(0, 3) == 90);
        assert!(physics::type_advantage(1, 3) == 90);
        assert!(physics::type_advantage(2, 3) == 90);
        // BAL vs BAL
        assert!(physics::type_advantage(3, 3) == 110);
        // Neutral matchups
        assert!(physics::type_advantage(0, 0) == 100);
        assert!(physics::type_advantage(0, 1) == 100);
        assert!(physics::type_advantage(1, 1) == 100);
        assert!(physics::type_advantage(2, 0) == 100);
    }

    #[test]
    fun test_wuxing_bonus_overcomes() {
        // Wood(0) > Earth(4) - but Earth is neutral
        assert!(physics::wuxing_bonus(0, 4) == 100); // Earth neutralizes

        // Water(3) > Fire(1): +20%
        assert!(physics::wuxing_bonus(3, 1) == 120);
        // Fire(1) > Metal(2): +20%
        assert!(physics::wuxing_bonus(1, 2) == 120);
        // Metal(2) > Wood(0): +20%
        assert!(physics::wuxing_bonus(2, 0) == 120);
    }

    #[test]
    fun test_wuxing_bonus_same_element() {
        // Same element: -10%
        assert!(physics::wuxing_bonus(0, 0) == 90); // Wood vs Wood
        assert!(physics::wuxing_bonus(1, 1) == 90); // Fire vs Fire
        assert!(physics::wuxing_bonus(2, 2) == 90); // Metal vs Metal
        assert!(physics::wuxing_bonus(3, 3) == 90); // Water vs Water
    }

    #[test]
    fun test_wuxing_bonus_earth_neutral() {
        // Earth(4) is always neutral
        assert!(physics::wuxing_bonus(4, 0) == 100);
        assert!(physics::wuxing_bonus(4, 1) == 100);
        assert!(physics::wuxing_bonus(4, 2) == 100);
        assert!(physics::wuxing_bonus(4, 3) == 100);
        assert!(physics::wuxing_bonus(0, 4) == 100);
        assert!(physics::wuxing_bonus(1, 4) == 100);
        assert!(physics::wuxing_bonus(4, 4) == 100);
    }

    #[test]
    fun test_wuxing_overcomes_cycle() {
        // Full cycle: Wood>Earth, Earth>Water, Water>Fire, Fire>Metal, Metal>Wood
        assert!(physics::overcomes(0, 4) == true);  // Wood > Earth
        assert!(physics::overcomes(4, 3) == true);  // Earth > Water
        assert!(physics::overcomes(3, 1) == true);  // Water > Fire
        assert!(physics::overcomes(1, 2) == true);  // Fire > Metal
        assert!(physics::overcomes(2, 0) == true);  // Metal > Wood

        // Reverse: should not overcome
        assert!(physics::overcomes(4, 0) == false);
        assert!(physics::overcomes(1, 3) == false);
        assert!(physics::overcomes(2, 1) == false);
        assert!(physics::overcomes(0, 2) == false);
    }

    #[test]
    fun test_spin_decay() {
        // Base decay test
        let am: u64 = 10000;
        let friction: u16 = 50;
        let base_decay_bps: u16 = 500; // 5%
        let wobble: u8 = 0;

        let decay = physics::compute_spin_decay(am, friction, base_decay_bps, wobble);
        // base = 10000 * 500 / 10000 = 500
        // friction_mod = 500 * 50 / 100 = 250
        assert!(decay == 250);
    }

    #[test]
    fun test_spin_decay_with_wobble() {
        let am: u64 = 10000;
        let decay = physics::compute_spin_decay(am, 50, 500, 2);
        // base = 500, friction_mod = 250
        // wobble_mod = 250 * (100 + 2*20) / 100 = 250 * 140 / 100 = 350
        assert!(decay == 350);
    }

    #[test]
    fun test_is_death_spin() {
        assert!(physics::is_death_spin(19, 100) == true);  // 19% < 20%
        assert!(physics::is_death_spin(20, 100) == false); // 20% = 20%
        assert!(physics::is_death_spin(50, 100) == false);
        assert!(physics::is_death_spin(0, 100) == true);
    }

    #[test]
    fun test_burst_loss() {
        // High impact, low resistance
        let loss = physics::compute_burst_loss(500, 100, 3);
        // resistance = 100 * 3 / 3 = 100
        // loss = 500 - 100 = 400
        assert!(loss == 400);
    }

    #[test]
    fun test_burst_loss_absorbed() {
        // Low impact, high resistance
        let loss = physics::compute_burst_loss(50, 300, 5);
        // resistance = 300 * 5 / 3 = 500
        // loss = 0 (50 < 500)
        assert!(loss == 0);
    }

    #[test]
    fun test_knockback() {
        assert!(physics::check_knockback(300, 100) == true);  // 300 > 200
        assert!(physics::check_knockback(200, 100) == false); // 200 = 200
        assert!(physics::check_knockback(100, 100) == false); // 100 < 200
    }

    // ===================================================================
    // AM calculation edge cases
    // ===================================================================

    #[test]
    fun test_am_max_friction_clamps_efficiency_to_1() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(3, 60, 100, 200, 0, ctx);
        // Max friction = 80 (bit validation allows 2-80)
        let bit = bit::mint(
            string::utf8(b"HighFriction"), 0, 80, 3, 0, false, 0, ctx,
        );

        let am = physics::compute_angular_momentum(&ratchet, &bit, 100);
        // inertia = 100 * 130 = 13000
        // efficiency = 100 - 80 = 20
        // am = 13000 * 20 * 100 / 10000 = 2600
        assert!(am == 2600);

        ratchet::destroy_for_testing(ratchet);
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_am_min_friction() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(3, 60, 100, 200, 0, ctx);
        // Min friction = 2
        let bit = bit::mint(
            string::utf8(b"LowFriction"), 2, 2, 3, 0, false, 0, ctx,
        );

        let am = physics::compute_angular_momentum(&ratchet, &bit, 100);
        // inertia = 100 * 130 = 13000
        // efficiency = 100 - 2 = 98
        // am = 13000 * 98 * 100 / 10000 = 12740
        assert!(am == 12740, 0);

        ratchet::destroy_for_testing(ratchet);
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_am_min_launch_power() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(0, 50, 100, 200, 0, ctx);
        let bit = bit::mint(
            string::utf8(b"Test"), 0, 50, 3, 0, false, 0, ctx,
        );

        // launch_power = 1 (minimum non-zero)
        let am = physics::compute_angular_momentum(&ratchet, &bit, 1);
        // inertia = 100 * 100 = 10000
        // efficiency = 50
        // am = 10000 * 50 * 1 / 10000 = 50
        assert!(am == 50, 0);

        ratchet::destroy_for_testing(ratchet);
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_am_zero_launch_power() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(3, 60, 100, 200, 0, ctx);
        let bit = bit::mint(
            string::utf8(b"Test"), 0, 50, 3, 0, false, 0, ctx,
        );

        let am = physics::compute_angular_momentum(&ratchet, &bit, 0);
        assert!(am == 0);

        ratchet::destroy_for_testing(ratchet);
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_am_zero_prongs() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(0, 50, 100, 200, 0, ctx);
        let bit = bit::mint(
            string::utf8(b"Test"), 0, 50, 3, 0, false, 0, ctx,
        );

        let am = physics::compute_angular_momentum(&ratchet, &bit, 100);
        // inertia = 100 * 100 (0 prongs) = 10000
        // efficiency = 50
        // am = 10000 * 50 * 100 / 10000 = 5000
        assert!(am == 5000, 0);

        ratchet::destroy_for_testing(ratchet);
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_am_max_prongs() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(9, 85, 150, 300, 0, ctx);
        let bit = bit::mint(
            string::utf8(b"Test"), 0, 10, 3, 0, false, 0, ctx,
        );

        let am = physics::compute_angular_momentum(&ratchet, &bit, 100);
        // inertia = 150 * 190 (9 prongs) = 28500
        // efficiency = 100 - 10 = 90
        // am = 28500 * 90 * 100 / 10000 = 25650
        assert!(am == 25650, 0);

        ratchet::destroy_for_testing(ratchet);
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Damage with all type combinations
    // ===================================================================

    #[test]
    fun test_damage_atk_vs_atk_neutral() {
        // ATK(0) vs ATK(0) = 100 (neutral)
        assert!(physics::type_advantage(0, 0) == 100);
    }

    #[test]
    fun test_damage_def_vs_def_neutral() {
        // DEF(1) vs DEF(1) = 100
        assert!(physics::type_advantage(1, 1) == 100);
    }

    #[test]
    fun test_damage_sta_vs_sta_neutral() {
        // STA(2) vs STA(2) = 100
        assert!(physics::type_advantage(2, 2) == 100);
    }

    #[test]
    fun test_damage_bal_vs_atk() {
        // BAL(3) attacks ATK(0) = 110
        assert!(physics::type_advantage(3, 0) == 110);
    }

    #[test]
    fun test_damage_bal_vs_def() {
        assert!(physics::type_advantage(3, 1) == 110);
    }

    #[test]
    fun test_damage_bal_vs_sta() {
        assert!(physics::type_advantage(3, 2) == 110);
    }

    #[test]
    fun test_damage_bal_vs_bal() {
        // BAL attacks BAL: atk_type==3 so +10%
        assert!(physics::type_advantage(3, 3) == 110);
    }

    #[test]
    fun test_damage_atk_vs_def_neutral() {
        // ATK(0) vs DEF(1): no special advantage
        assert!(physics::type_advantage(0, 1) == 100);
    }

    #[test]
    fun test_damage_sta_vs_atk_neutral() {
        // STA(2) vs ATK(0): no advantage
        assert!(physics::type_advantage(2, 0) == 100);
    }

    #[test]
    fun test_damage_def_vs_sta_neutral() {
        // DEF(1) vs STA(2): no special advantage in reverse
        assert!(physics::type_advantage(1, 2) == 100);
    }

    #[test]
    fun test_compute_damage_with_element_bonus() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let atk_blade = blade::mint(
            string::utf8(b"Water"), 3, 0, 0, 60, 20, 0, ctx,
        );
        let def_blade = blade::mint(
            string::utf8(b"Fire"), 1, 0, 0, 40, 30, 0, ctx,
        );

        // Water > Fire: element_bonus = 120
        let (dmg, recoil) = physics::compute_damage(
            &atk_blade, 10000, &def_blade,
            100, 120, 100,
        );
        // raw = 60 * 10000 / 1000 = 600
        // dmg = 600 * 100 * 120 * 100 / 1_000_000 = 720
        assert!(dmg == 720);
        // recoil = 720 * 20 / 100 = 144
        assert!(recoil == 144);

        blade::destroy_for_testing(atk_blade);
        blade::destroy_for_testing(def_blade);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_compute_damage_combined_bonuses() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let atk_blade = blade::mint(
            string::utf8(b"ATK"), 0, 0, 0, 80, 40, 0, ctx,
        );
        let def_blade = blade::mint(
            string::utf8(b"STA"), 2, 2, 0, 30, 20, 0, ctx,
        );

        // ATK>STA (130) + Water>Fire (120) + variance 110
        let (dmg, _) = physics::compute_damage(
            &atk_blade, 10000, &def_blade,
            130, 120, 110,
        );
        // raw = 80 * 10000 / 1000 = 800
        // dmg = 800 * 130 * 120 * 110 / 1_000_000 = 1372 (truncated)
        assert!(dmg == 1372);

        blade::destroy_for_testing(atk_blade);
        blade::destroy_for_testing(def_blade);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Wuxing full cycle -- all 5 advantage pairs
    // ===================================================================

    #[test]
    fun test_wuxing_full_cycle_all_overcomes() {
        // Wood(0) > Earth(4)
        assert!(physics::overcomes(0, 4) == true);
        // Earth(4) > Water(3)
        assert!(physics::overcomes(4, 3) == true);
        // Water(3) > Fire(1)
        assert!(physics::overcomes(3, 1) == true);
        // Fire(1) > Metal(2)
        assert!(physics::overcomes(1, 2) == true);
        // Metal(2) > Wood(0)
        assert!(physics::overcomes(2, 0) == true);
    }

    #[test]
    fun test_wuxing_full_cycle_no_reverse() {
        // Reverse of each pair should NOT overcome
        assert!(physics::overcomes(4, 0) == false);
        assert!(physics::overcomes(3, 4) == false);
        assert!(physics::overcomes(1, 3) == false);
        assert!(physics::overcomes(2, 1) == false);
        assert!(physics::overcomes(0, 2) == false);
    }

    #[test]
    fun test_wuxing_no_self_advantage() {
        assert!(physics::overcomes(0, 0) == false);
        assert!(physics::overcomes(1, 1) == false);
        assert!(physics::overcomes(2, 2) == false);
        assert!(physics::overcomes(3, 3) == false);
        assert!(physics::overcomes(4, 4) == false);
    }

    #[test]
    fun test_wuxing_bonus_water_fire() {
        // Water(3) > Fire(1): +20%
        assert!(physics::wuxing_bonus(3, 1) == 120);
    }

    #[test]
    fun test_wuxing_bonus_fire_metal() {
        assert!(physics::wuxing_bonus(1, 2) == 120);
    }

    #[test]
    fun test_wuxing_bonus_metal_wood() {
        assert!(physics::wuxing_bonus(2, 0) == 120);
    }

    #[test]
    fun test_wuxing_non_adjacent_neutral() {
        // Wood(0) vs Fire(1): no overcome relationship
        assert!(physics::wuxing_bonus(0, 1) == 100);
        // Wood(0) vs Water(3): no overcome
        assert!(physics::wuxing_bonus(0, 3) == 100);
        // Fire(1) vs Wood(0)
        assert!(physics::wuxing_bonus(1, 0) == 100);
        // Metal(2) vs Water(3)
        assert!(physics::wuxing_bonus(2, 3) == 100);
    }

    // ===================================================================
    // Spin steal with zero damage
    // ===================================================================

    #[test]
    fun test_spin_steal_zero_damage_opposite_direction() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let atk_blade = blade::mint(
            string::utf8(b"Right"), 0, 0, 0, 50, 30, 0, ctx,
        );
        let def_blade = blade::mint(
            string::utf8(b"Left"), 1, 0, 1, 50, 30, 0, ctx,
        );

        // Even with opposite spin, 0 damage = 0 steal
        let steal = physics::compute_spin_steal(&atk_blade, &def_blade, 0);
        assert!(steal == 0);

        blade::destroy_for_testing(atk_blade);
        blade::destroy_for_testing(def_blade);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_spin_steal_zero_damage_same_direction() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let atk_blade = blade::mint(
            string::utf8(b"R1"), 0, 0, 0, 50, 30, 0, ctx,
        );
        let def_blade = blade::mint(
            string::utf8(b"R2"), 1, 0, 0, 50, 30, 0, ctx,
        );

        let steal = physics::compute_spin_steal(&atk_blade, &def_blade, 0);
        assert!(steal == 0);

        blade::destroy_for_testing(atk_blade);
        blade::destroy_for_testing(def_blade);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Spin decay edge cases
    // ===================================================================

    #[test]
    fun test_spin_decay_zero_am() {
        let decay = physics::compute_spin_decay(0, 50, 500, 0);
        // base = 0, friction_mod = 0, minimum check: am=0 so no min
        assert!(decay == 0);
    }

    #[test]
    fun test_spin_decay_minimum_decay_1_when_am_positive() {
        // Very low params that would compute to 0 but am > 0 -> min decay 1
        let decay = physics::compute_spin_decay(1, 2, 1, 0);
        // base = 1 * 1 / 10000 = 0
        // friction_mod = 0 * 2 / 100 = 0
        // wobble_mod = 0 (no wobble)
        // min check: 0 == 0 && am(1) > 0 -> return 1
        assert!(decay == 1);
    }

    #[test]
    fun test_spin_decay_high_wobble() {
        let decay = physics::compute_spin_decay(10000, 50, 500, 5);
        // base = 500
        // friction_mod = 250
        // wobble_mod = 250 * (100 + 5*20) / 100 = 250 * 200 / 100 = 500
        assert!(decay == 500);
    }

    // ===================================================================
    // Death spin boundary tests
    // ===================================================================

    #[test]
    fun test_is_death_spin_boundary_values() {
        // 19/100 = 19% < 20% -> true
        assert!(physics::is_death_spin(19, 100) == true);
        // 20/100 = 20% -> 20*5 = 100, NOT < 100 -> false
        assert!(physics::is_death_spin(20, 100) == false);
        // 1/100 = 1% -> true
        assert!(physics::is_death_spin(1, 100) == true);
        // 0/100 = 0% -> true
        assert!(physics::is_death_spin(0, 100) == true);
        // 100/100 = 100% -> false
        assert!(physics::is_death_spin(100, 100) == false);
    }

    #[test]
    fun test_is_death_spin_large_values() {
        // 1999/10000 = 19.99% < 20% -> 1999*5=9995 < 10000 -> true
        assert!(physics::is_death_spin(1999, 10000) == true);
        // 2000/10000 = 20% -> 2000*5=10000, NOT < 10000 -> false
        assert!(physics::is_death_spin(2000, 10000) == false);
    }

    // ===================================================================
    // Burst loss edge cases
    // ===================================================================

    #[test]
    fun test_burst_loss_exact_match() {
        // impact exactly equals resistance -> 0 loss
        let loss = physics::compute_burst_loss(100, 300, 1);
        // resistance = 300 * 1 / 3 = 100
        // loss = 100 - 100 = 0
        assert!(loss == 0);
    }

    #[test]
    fun test_burst_loss_max_tightness() {
        let loss = physics::compute_burst_loss(500, 200, 5);
        // resistance = 200 * 5 / 3 = 333
        // loss = 500 - 333 = 167
        assert!(loss == 167);
    }

    #[test]
    fun test_burst_loss_min_tightness() {
        let loss = physics::compute_burst_loss(500, 200, 1);
        // resistance = 200 * 1 / 3 = 66
        // loss = 500 - 66 = 434
        assert!(loss == 434);
    }

    #[test]
    fun test_burst_loss_zero_impact() {
        let loss = physics::compute_burst_loss(0, 200, 3);
        assert!(loss == 0);
    }

    // ===================================================================
    // Lock tightness drain
    // ===================================================================

    #[test]
    fun test_lock_tightness_drain_values() {
        // tightness 1
        let drain = physics::lock_tightness_drain(1, 300);
        assert!(drain == 100); // 300 * 1 / 3

        // tightness 3
        let drain = physics::lock_tightness_drain(3, 300);
        assert!(drain == 300); // 300 * 3 / 3

        // tightness 5
        let drain = physics::lock_tightness_drain(5, 300);
        assert!(drain == 500); // 300 * 5 / 3
    }

    // ===================================================================
    // Knockback edge cases
    // ===================================================================

    #[test]
    fun test_knockback_zero_damage() {
        assert!(physics::check_knockback(0, 100) == false);
    }

    #[test]
    fun test_knockback_zero_weight() {
        // damage > 0 * 2 = 0 -> true
        assert!(physics::check_knockback(1, 0) == true);
    }

    #[test]
    fun test_knockback_barely_over() {
        assert!(physics::check_knockback(201, 100) == true);
    }
}
