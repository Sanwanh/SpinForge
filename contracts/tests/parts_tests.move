#[test_only]
module spinforge::parts_tests {
    use std::string;
    use sui::test_scenario;
    use spinforge::blade;
    use spinforge::ratchet;
    use spinforge::bit;

    // ===== Blade Tests =====

    #[test]
    fun test_blade_mint_valid() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let blade = blade::mint(
            string::utf8(b"Phoenix Wing"),
            1, // Suzaku
            0, // ATK
            0, // Right spin
            75,
            25,
            0, // Common
            ctx,
        );

        assert!(blade::spirit_beast(&blade) == 1);
        assert!(blade::element(&blade) == 1); // Fire
        assert!(blade::bey_type(&blade) == 0);
        assert!(blade::spin_direction(&blade) == 0);
        assert!(blade::attack(&blade) == 75);
        assert!(blade::recoil_factor(&blade) == 25);
        assert!(blade::rarity(&blade) == 0);
        assert!(blade::xp(&blade) == 0);

        blade::destroy_for_testing(blade);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_blade_spirit_beast_to_element() {
        // Seiryu -> Wood
        assert!(blade::spirit_beast_to_element(0) == 0);
        // Suzaku -> Fire
        assert!(blade::spirit_beast_to_element(1) == 1);
        // Byakko -> Metal
        assert!(blade::spirit_beast_to_element(2) == 2);
        // Genbu -> Water
        assert!(blade::spirit_beast_to_element(3) == 3);
        // Koryu -> Earth
        assert!(blade::spirit_beast_to_element(4) == 4);
    }

    #[test]
    fun test_blade_add_xp() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut blade = blade::mint_for_testing(ctx);
        assert!(blade::xp(&blade) == 0);

        blade::add_xp(&mut blade, 100);
        assert!(blade::xp(&blade) == 100);

        blade::add_xp(&mut blade, 50);
        assert!(blade::xp(&blade) == 150);

        blade::destroy_for_testing(blade);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_blade_mint_invalid_spirit_beast() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let blade = blade::mint(
            string::utf8(b"Bad"),
            5, // Invalid spirit beast
            0, 0, 50, 30, 0, ctx,
        );
        blade::destroy_for_testing(blade);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 4)]
    fun test_blade_mint_attack_too_low() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let blade = blade::mint(
            string::utf8(b"Bad"),
            0, 0, 0,
            5, // Below minimum 10
            30, 0, ctx,
        );
        blade::destroy_for_testing(blade);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 4)]
    fun test_blade_mint_attack_too_high() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let blade = blade::mint(
            string::utf8(b"Bad"),
            0, 0, 0,
            101, // Above maximum 100
            30, 0, ctx,
        );
        blade::destroy_for_testing(blade);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_blade_left_spin() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let blade = blade::mint(
            string::utf8(b"Left Spin"),
            3, // Genbu
            2, // STA
            1, // Left spin
            60,
            20,
            1, // Rare
            ctx,
        );

        assert!(blade::spin_direction(&blade) == 1);
        assert!(blade::element(&blade) == 3); // Water

        blade::destroy_for_testing(blade);
        test_scenario::end(scenario);
    }

    // ===== Ratchet Tests =====

    #[test]
    fun test_ratchet_mint_valid() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(5, 70, 150, 300, 1, ctx);

        assert!(ratchet::prongs(&ratchet) == 5);
        assert!(ratchet::height(&ratchet) == 70);
        assert!(ratchet::weight(&ratchet) == 150);
        assert!(ratchet::burst_resistance(&ratchet) == 300);
        assert!(ratchet::rarity(&ratchet) == 1);
        assert!(ratchet::xp(&ratchet) == 0);

        ratchet::destroy_for_testing(ratchet);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_ratchet_mint_invalid_prongs() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(10, 60, 100, 200, 0, ctx); // prongs > 9
        ratchet::destroy_for_testing(ratchet);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_ratchet_mint_invalid_height() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let ratchet = ratchet::mint(3, 65, 100, 200, 0, ctx); // 65 not valid
        ratchet::destroy_for_testing(ratchet);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_ratchet_all_valid_heights() {
        let mut scenario = test_scenario::begin(@0x1);
        let heights = vector[50u8, 55, 60, 70, 80, 85];
        let mut i = 0u64;
        while (i < vector::length(&heights)) {
            let ctx = test_scenario::ctx(&mut scenario);
            let h = *vector::borrow(&heights, i);
            let ratchet = ratchet::mint(3, h, 100, 200, 0, ctx);
            assert!(ratchet::height(&ratchet) == h);
            ratchet::destroy_for_testing(ratchet);
            i = i + 1;
        };
        test_scenario::end(scenario);
    }

    // ===== Bit Tests =====

    #[test]
    fun test_bit_mint_valid() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let bit = bit::mint(
            string::utf8(b"Needle"),
            2, // Stamina
            5, // Low friction
            1, // Center only
            0, // No gear
            false,
            0, // Common
            ctx,
        );

        assert!(bit::category(&bit) == 2);
        assert!(bit::friction(&bit) == 5);
        assert!(bit::mobility(&bit) == 1);
        assert!(bit::gear_diameter(&bit) == 0);
        assert!(bit::has_life_after_death(&bit) == false);

        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_bit_gear_type() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let bit = bit::mint(
            string::utf8(b"Gear Flat"),
            3, // Gear category
            40,
            3,
            8, // Medium gear
            false,
            1,
            ctx,
        );

        assert!(bit::category(&bit) == 3);
        assert!(bit::gear_diameter(&bit) == 8);

        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_bit_life_after_death() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let bit = bit::mint(
            string::utf8(b"Ball"),
            1, // Defense
            30,
            2,
            0,
            true, // Has LAD
            0,
            ctx,
        );

        assert!(bit::has_life_after_death(&bit) == true);

        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_bit_mint_invalid_friction_low() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let bit = bit::mint(
            string::utf8(b"Bad"),
            0, 1, 3, 0, false, 0, ctx, // friction 1 < 2
        );
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3)]
    fun test_bit_mint_invalid_gear_diameter() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let bit = bit::mint(
            string::utf8(b"Bad"),
            3, 40, 3,
            7, // Invalid gear diameter
            false, 0, ctx,
        );
        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_bit_all_valid_gear_diameters() {
        let mut scenario = test_scenario::begin(@0x1);
        let diameters = vector[0u8, 4, 6, 8, 10, 12];
        let mut i = 0u64;
        while (i < vector::length(&diameters)) {
            let ctx = test_scenario::ctx(&mut scenario);
            let d = *vector::borrow(&diameters, i);
            let cat = if (d > 0) { 3 } else { 0 };
            let bit = bit::mint(
                string::utf8(b"Test"),
                cat, 40, 3, d, false, 0, ctx,
            );
            assert!(bit::gear_diameter(&bit) == d);
            bit::destroy_for_testing(bit);
            i = i + 1;
        };
        test_scenario::end(scenario);
    }
}
