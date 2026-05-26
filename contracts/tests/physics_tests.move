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
}
