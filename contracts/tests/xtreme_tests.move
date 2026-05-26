#[test_only]
module spinforge::xtreme_tests {
    use std::string;
    use sui::test_scenario;
    use spinforge::bit;
    use spinforge::stadium;
    use spinforge::xtreme_dash;

    #[test]
    fun test_can_dash_with_gear_on_rail() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let gear_bit = bit::mint(
            string::utf8(b"Gear Flat"), 3, 40, 3, 8, false, 0, ctx,
        );
        let stadium = stadium::mint_for_testing(ctx);

        // Zone 3 is a rail zone in the test stadium
        assert!(xtreme_dash::can_dash(&gear_bit, 3, &stadium) == true);
        // Zone 0 (center) is not a rail zone
        assert!(xtreme_dash::can_dash(&gear_bit, 0, &stadium) == false);

        bit::destroy_for_testing(gear_bit);
        stadium::destroy_for_testing(stadium);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_cannot_dash_without_gear() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let no_gear_bit = bit::mint(
            string::utf8(b"Rush"), 0, 50, 3, 0, false, 0, ctx,
        );
        let stadium = stadium::mint_for_testing(ctx);

        // No gear = cannot dash even on rail
        assert!(xtreme_dash::can_dash(&no_gear_bit, 3, &stadium) == false);

        bit::destroy_for_testing(no_gear_bit);
        stadium::destroy_for_testing(stadium);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_accuracy_thresholds() {
        // Small gear (4, 6): 70%
        assert!(xtreme_dash::accuracy_threshold(4) == 70);
        assert!(xtreme_dash::accuracy_threshold(6) == 70);

        // Medium gear (8, 10): 85%
        assert!(xtreme_dash::accuracy_threshold(8) == 85);
        assert!(xtreme_dash::accuracy_threshold(10) == 85);

        // Large gear (12): 95%
        assert!(xtreme_dash::accuracy_threshold(12) == 95);
    }

    #[test]
    fun test_compute_dash_hit() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let gear_bit = bit::mint(
            string::utf8(b"Gear Flat"), 3, 40, 3, 8, false, 0, ctx,
        );

        // Roll 50 <= 85 threshold for medium gear = HIT
        let (damage, hit) = xtreme_dash::compute_dash(&gear_bit, 10000, 50);
        assert!(hit == true);
        // Hit damage = 10000 * 150 / 100 = 15000
        assert!(damage == 15000);

        bit::destroy_for_testing(gear_bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_compute_dash_miss() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let small_gear_bit = bit::mint(
            string::utf8(b"Gear Needle"), 3, 40, 3, 4, false, 0, ctx,
        );

        // Roll 80 > 70 threshold for small gear = MISS
        let (damage, hit) = xtreme_dash::compute_dash(&small_gear_bit, 10000, 80);
        assert!(hit == false);
        // Miss damage = 10000 * 50 / 100 = 5000
        assert!(damage == 5000);

        bit::destroy_for_testing(small_gear_bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_compute_dash_large_gear_reliable() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let large_gear_bit = bit::mint(
            string::utf8(b"Gear Ball"), 3, 40, 3, 12, false, 0, ctx,
        );

        // Roll 95 <= 95 threshold = HIT (barely)
        let (_damage, hit) = xtreme_dash::compute_dash(&large_gear_bit, 10000, 95);
        assert!(hit == true);

        // Roll 96 > 95 = MISS
        let (_damage, hit) = xtreme_dash::compute_dash(&large_gear_bit, 10000, 96);
        assert!(hit == false);

        bit::destroy_for_testing(large_gear_bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_dash_recoil() {
        // Recoil factor 30, damage 15000, 2x multiplier
        let recoil = xtreme_dash::compute_dash_recoil(15000, 30);
        // 15000 * 30 * 2 / 100 = 9000
        assert!(recoil == 9000);
    }

    #[test]
    fun test_is_xtreme_finish() {
        // Hit + defender AM = 0 = Xtreme Finish
        assert!(xtreme_dash::is_xtreme_finish(true, 0) == true);
        // Hit + defender AM > 0 = not Xtreme Finish
        assert!(xtreme_dash::is_xtreme_finish(true, 100) == false);
        // Miss + defender AM = 0 = NOT Xtreme Finish (must be a hit)
        assert!(xtreme_dash::is_xtreme_finish(false, 0) == false);
    }

    #[test]
    fun test_dash_edge_case_small_gear_boundary() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let bit = bit::mint(
            string::utf8(b"GN"), 3, 40, 3, 6, false, 0, ctx,
        );

        // Roll exactly 70 = HIT (<=)
        let (_damage, hit) = xtreme_dash::compute_dash(&bit, 5000, 70);
        assert!(hit == true);

        // Roll 71 = MISS
        let (_damage, hit) = xtreme_dash::compute_dash(&bit, 5000, 71);
        assert!(hit == false);

        bit::destroy_for_testing(bit);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Can dash without gear -- should return false
    // ===================================================================

    #[test]
    fun test_can_dash_without_gear_returns_false() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        // gear_diameter = 0 (no gear)
        let no_gear_bit = bit::mint(
            string::utf8(b"NoGear"), 0, 50, 3, 0, false, 0, ctx,
        );
        let stadium = stadium::mint_for_testing(ctx);

        // Even on a rail zone, no gear = can't dash
        assert!(xtreme_dash::can_dash(&no_gear_bit, 3, &stadium) == false);
        // Non-rail zone
        assert!(xtreme_dash::can_dash(&no_gear_bit, 0, &stadium) == false);

        bit::destroy_for_testing(no_gear_bit);
        stadium::destroy_for_testing(stadium);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Can dash on non-rail zone -- should return false
    // ===================================================================

    #[test]
    fun test_can_dash_on_non_rail_zone_returns_false() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        // Gear bit (gear_diameter = 8)
        let gear_bit = bit::mint(
            string::utf8(b"GearBit"), 3, 40, 3, 8, false, 0, ctx,
        );
        let stadium = stadium::mint_for_testing(ctx);

        // Zone 0 is center (not a rail zone in test stadium)
        assert!(xtreme_dash::can_dash(&gear_bit, 0, &stadium) == false);
        // Zone 1 is not a rail zone
        assert!(xtreme_dash::can_dash(&gear_bit, 1, &stadium) == false);
        // Zone 2 is not a rail zone
        assert!(xtreme_dash::can_dash(&gear_bit, 2, &stadium) == false);
        // Zone 3 IS a rail zone -> should be true
        assert!(xtreme_dash::can_dash(&gear_bit, 3, &stadium) == true);

        bit::destroy_for_testing(gear_bit);
        stadium::destroy_for_testing(stadium);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Additional xtreme dash coverage
    // ===================================================================

    #[test]
    fun test_can_dash_no_gear_no_rail() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let no_gear_bit = bit::mint(
            string::utf8(b"Flat"), 0, 50, 3, 0, false, 0, ctx,
        );
        let stadium = stadium::mint_for_testing(ctx);

        // Neither gear nor rail zone
        assert!(xtreme_dash::can_dash(&no_gear_bit, 0, &stadium) == false);

        bit::destroy_for_testing(no_gear_bit);
        stadium::destroy_for_testing(stadium);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_dash_damage_zero_am() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let gear_bit = bit::mint(
            string::utf8(b"Gear"), 3, 40, 3, 8, false, 0, ctx,
        );

        // 0 AM -> 0 damage regardless of hit
        let (damage, hit) = xtreme_dash::compute_dash(&gear_bit, 0, 50);
        assert!(hit == true);
        assert!(damage == 0);

        bit::destroy_for_testing(gear_bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_dash_recoil_zero_factor() {
        // recoil_factor = 0 -> 0 recoil
        let recoil = xtreme_dash::compute_dash_recoil(15000, 0);
        assert!(recoil == 0);
    }

    #[test]
    fun test_dash_recoil_small_damage() {
        let recoil = xtreme_dash::compute_dash_recoil(10, 30);
        // 10 * 30 * 2 / 100 = 6
        assert!(recoil == 6);
    }

    #[test]
    fun test_xtreme_finish_both_conditions_required() {
        // hit=true, am_after=0 -> xtreme finish
        assert!(xtreme_dash::is_xtreme_finish(true, 0) == true);
        // hit=true, am_after=1 -> NOT xtreme
        assert!(xtreme_dash::is_xtreme_finish(true, 1) == false);
        // hit=false, am_after=0 -> NOT xtreme (must hit)
        assert!(xtreme_dash::is_xtreme_finish(false, 0) == false);
        // hit=false, am_after=100 -> NOT xtreme
        assert!(xtreme_dash::is_xtreme_finish(false, 100) == false);
    }

    #[test]
    fun test_accuracy_threshold_all_gear_sizes() {
        // gear 4 -> small
        assert!(xtreme_dash::accuracy_threshold(4) == 70);
        // gear 6 -> small boundary
        assert!(xtreme_dash::accuracy_threshold(6) == 70);
        // gear 8 -> medium
        assert!(xtreme_dash::accuracy_threshold(8) == 85);
        // gear 10 -> medium boundary
        assert!(xtreme_dash::accuracy_threshold(10) == 85);
        // gear 12 -> large
        assert!(xtreme_dash::accuracy_threshold(12) == 95);
    }

    #[test]
    fun test_compute_dash_roll_1_always_hits() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let small_bit = bit::mint(
            string::utf8(b"Small"), 3, 40, 3, 4, false, 0, ctx,
        );

        // Roll 1 <= any threshold
        let (_damage, hit) = xtreme_dash::compute_dash(&small_bit, 10000, 1);
        assert!(hit == true);

        bit::destroy_for_testing(small_bit);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_compute_dash_roll_100_always_misses_non_large() {
        let mut scenario = test_scenario::begin(@0x1);
        let ctx = test_scenario::ctx(&mut scenario);

        let medium_bit = bit::mint(
            string::utf8(b"Med"), 3, 40, 3, 8, false, 0, ctx,
        );

        // Roll 100 > 85 threshold -> miss
        let (_damage, hit) = xtreme_dash::compute_dash(&medium_bit, 10000, 100);
        assert!(hit == false);

        bit::destroy_for_testing(medium_bit);
        test_scenario::end(scenario);
    }
}
