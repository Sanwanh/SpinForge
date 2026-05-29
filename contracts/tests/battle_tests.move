#[test_only]
module spinforge::battle_tests {
    use sui::test_scenario;
    use sui::clock;
    use spinforge::battle;
    use spinforge::admin;

    const PLAYER_A: address = @0xA;
    const PLAYER_B: address = @0xB;

    fun create_test_ids(scenario: &mut test_scenario::Scenario): (vector<ID>, vector<ID>, ID) {
        let ctx = test_scenario::ctx(scenario);
        let obj_a1 = object::new(ctx);
        let id_a1 = object::uid_to_inner(&obj_a1);
        object::delete(obj_a1);

        let obj_a2 = object::new(ctx);
        let id_a2 = object::uid_to_inner(&obj_a2);
        object::delete(obj_a2);

        let obj_a3 = object::new(ctx);
        let id_a3 = object::uid_to_inner(&obj_a3);
        object::delete(obj_a3);

        let obj_b1 = object::new(ctx);
        let id_b1 = object::uid_to_inner(&obj_b1);
        object::delete(obj_b1);

        let obj_b2 = object::new(ctx);
        let id_b2 = object::uid_to_inner(&obj_b2);
        object::delete(obj_b2);

        let obj_b3 = object::new(ctx);
        let id_b3 = object::uid_to_inner(&obj_b3);
        object::delete(obj_b3);

        let obj_s = object::new(ctx);
        let stadium_id = object::uid_to_inner(&obj_s);
        object::delete(obj_s);

        let deck_a = vector[id_a1, id_a2, id_a3];
        let deck_b = vector[id_b1, id_b2, id_b3];

        (deck_a, deck_b, stadium_id)
    }

    #[test]
    fun test_create_match() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        assert!(battle::player_a(&match_obj) == PLAYER_A);
        assert!(battle::player_b(&match_obj) == PLAYER_B);
        assert!(battle::score_a(&match_obj) == 0);
        assert!(battle::score_b(&match_obj) == 0);
        assert!(battle::match_state(&match_obj) == 0); // BEY_SELECT
        assert!(battle::rounds_played(&match_obj) == 0);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 10)] // EInvalidDeckSize (L-1)
    fun test_create_match_rejects_wrong_deck_size() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, _deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        // deck_b has only 2 entries — must abort instead of risking an
        // out-of-bounds on the length-3 `used_b` vector later.
        let short_deck_b = vector[*vector::borrow(&deck_a, 0), *vector::borrow(&deck_a, 1)];
        let match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, short_deck_b, ctx,
        );

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_select_bey_and_start_round() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj,
            0, 0, // Both pick first bey
            10000, 10000, // AM
            500, 500, // Burst integrity
            3, 3, // Lock tightness
            &clk,
            ctx,
        );

        assert!(battle::match_state(&match_obj) == 1); // IN_ROUND
        assert!(battle::round_am_a(&round) == 10000);
        assert!(battle::round_am_b(&round) == 10000);
        assert!(battle::round_bi_a(&round) == 500);
        assert!(battle::round_bi_b(&round) == 500);
        assert!(battle::round_turn(&round) == 0);

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_commit_action() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        // Player A commits
        assert!(battle::round_state(&round) == 0); // COMMIT
        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"hash_a");
        assert!(battle::round_state(&round) == 0); // Still COMMIT (need both)

        // Player B commits
        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"hash_b");
        assert!(battle::round_state(&round) == 1); // REVEAL

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_resolve_turn() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        // Commit both
        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"hash_a");
        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"hash_b");

        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        battle::resolve_turn(
            &admin_cap,
            &mut round,
            200, 100,
            50, 30,
            100, 100,
            50, 30,
        );

        assert!(battle::round_am_a(&round) == 9750);
        assert!(battle::round_am_b(&round) == 9670);
        assert!(battle::round_bi_a(&round) == 450);
        assert!(battle::round_bi_b(&round) == 470);
        assert!(battle::round_turn(&round) == 1);
        assert!(battle::round_state(&round) == 0);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_check_win_spin_finish() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 100, // B has low AM
            500, 500, 3, 3, &clk, ctx,
        );

        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"ha");
        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"hb");

        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        battle::resolve_turn(
            &admin_cap,
            &mut round,
            200, 0,
            0, 0,
            0, 100,
            0, 0,
        );
        admin::destroy_admin_cap(admin_cap);

        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 0); // SPIN finish
        assert!(winner_is_a == true);
        assert!(points == 1);

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_check_win_burst_finish() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000,
            500, 50, // B has low burst integrity
            3, 3, &clk, ctx,
        );

        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"ha");
        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"hb");

        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        battle::resolve_turn(
            &admin_cap,
            &mut round,
            0, 0, 0, 0, 0, 0,
            0, 50,
        );
        admin::destroy_admin_cap(admin_cap);

        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 2); // BURST finish
        assert!(winner_is_a == true);
        assert!(points == 2);

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_apply_round_result_scoring() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // A wins a spin finish (1 pt)
        let is_over = battle::apply_round_result(&mut match_obj, true, 1);
        assert!(is_over == false);
        assert!(battle::score_a(&match_obj) == 1);
        assert!(battle::score_b(&match_obj) == 0);

        // B wins a burst finish (2 pts)
        let is_over = battle::apply_round_result(&mut match_obj, false, 2);
        assert!(is_over == false);
        assert!(battle::score_a(&match_obj) == 1);
        assert!(battle::score_b(&match_obj) == 2);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_match_complete_at_7() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // A wins 3 xtreme finishes (3 pts each) = 9 pts total
        let _ = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(battle::score_a(&match_obj) == 3);
        let _ = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(battle::score_a(&match_obj) == 6);
        let is_over = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(is_over == true);
        assert!(battle::score_a(&match_obj) == 9);
        assert!(battle::match_state(&match_obj) == 2); // COMPLETE

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_finish_points() {
        assert!(battle::finish_points(0) == 1); // Spin
        assert!(battle::finish_points(1) == 2); // Over
        assert!(battle::finish_points(2) == 2); // Burst
        assert!(battle::finish_points(3) == 3); // Xtreme
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_commit_action_not_player() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        // Random address tries to commit
        battle::commit_action(&mut round, @0xDEAD, &match_obj, b"hack");

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Helper: commit both players and resolve a turn in one step
    // ===================================================================
    fun commit_and_resolve(
        round: &mut battle::Round,
        match_obj: &battle::Match,
        admin_cap: &admin::AdminCap,
        damage_a_to_b: u64,
        damage_b_to_a: u64,
        recoil_a: u64,
        recoil_b: u64,
        spin_decay_a: u64,
        spin_decay_b: u64,
        burst_loss_a: u64,
        burst_loss_b: u64,
    ) {
        battle::commit_action(round, PLAYER_A, match_obj, b"ha");
        battle::commit_action(round, PLAYER_B, match_obj, b"hb");
        battle::resolve_turn(
            admin_cap, round,
            damage_a_to_b, damage_b_to_a,
            recoil_a, recoil_b,
            spin_decay_a, spin_decay_b,
            burst_loss_a, burst_loss_b,
        );
    }

    // ===================================================================
    // 1. Multi-turn battles -- 5+ turns with diminishing AM
    // ===================================================================

    #[test]
    fun test_multi_turn_5_turns_diminishing_am() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Turn 1: symmetric 500 spin_decay, 200 damage each
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 200, 200, 0, 0, 500, 500, 0, 0);
        assert!(battle::round_am_a(&round) == 9300); // 10000-500-200
        assert!(battle::round_am_b(&round) == 9300);
        assert!(battle::round_turn(&round) == 1);

        // Turn 2
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 200, 200, 0, 0, 500, 500, 0, 0);
        assert!(battle::round_am_a(&round) == 8600);
        assert!(battle::round_am_b(&round) == 8600);
        assert!(battle::round_turn(&round) == 2);

        // Turn 3
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 200, 200, 0, 0, 500, 500, 0, 0);
        assert!(battle::round_am_a(&round) == 7900);
        assert!(battle::round_am_b(&round) == 7900);

        // Turn 4
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 200, 200, 0, 0, 500, 500, 0, 0);
        assert!(battle::round_am_a(&round) == 7200);

        // Turn 5
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 200, 200, 0, 0, 500, 500, 0, 0);
        assert!(battle::round_am_a(&round) == 6500);
        assert!(battle::round_turn(&round) == 5);

        let (is_over, _, _, _) = battle::check_win(&round, &match_obj);
        assert!(is_over == false); // Still going

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multi_turn_asymmetric_damage_a_wins() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);

        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            5000, 5000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // A does 1000 damage, B does 500 damage each turn + 200 decay each
        // Turn 1: A=5000-200-500=4300, B=5000-200-1000=3800
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 1000, 500, 0, 0, 200, 200, 0, 0);
        assert!(battle::round_am_a(&round) == 4300);
        assert!(battle::round_am_b(&round) == 3800);

        // Turn 2: A=4300-200-500=3600, B=3800-200-1000=2600
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 1000, 500, 0, 0, 200, 200, 0, 0);
        assert!(battle::round_am_a(&round) == 3600);
        assert!(battle::round_am_b(&round) == 2600);

        // Turn 3: A=3600-200-500=2900, B=2600-200-1000=1400
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 1000, 500, 0, 0, 200, 200, 0, 0);
        assert!(battle::round_am_a(&round) == 2900);
        assert!(battle::round_am_b(&round) == 1400);

        // Turn 4: A=2900-200-500=2200, B=1400-200-1000=200
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 1000, 500, 0, 0, 200, 200, 0, 0);
        assert!(battle::round_am_a(&round) == 2200);
        assert!(battle::round_am_b(&round) == 200);

        // Turn 5: A=2200-200-500=1500, B=200-200-1000 => 0 (clamped)
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 1000, 500, 0, 0, 200, 200, 0, 0);
        assert!(battle::round_am_b(&round) == 0);

        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 0); // Spin finish
        assert!(winner_is_a == true);
        assert!(points == 1);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multi_turn_7_turns_b_wins() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            7000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // B deals 800 damage + 200 decay to A per turn; A deals 300 damage + 200 decay to B
        let mut i = 0;
        while (i < 7) {
            commit_and_resolve(&mut round, &match_obj, &admin_cap, 300, 800, 0, 0, 200, 200, 0, 0);
            i = i + 1;
        };
        // A: 7000 - 7*(200+800) = 7000 - 7000 = 0
        assert!(battle::round_am_a(&round) == 0);
        assert!(battle::round_turn(&round) == 7);

        let (is_over, _, winner_is_a, _) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(winner_is_a == false);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multi_turn_recoil_matters() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            3000, 3000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // A does 500 damage with 300 recoil each turn, decay 100
        // Turn 1: A=3000-100-0-300=2600, B=3000-100-500-0=2400
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 500, 0, 300, 0, 100, 100, 0, 0);
        assert!(battle::round_am_a(&round) == 2600);
        assert!(battle::round_am_b(&round) == 2400);

        // Turn 2: A=2600-100-300=2200, B=2400-100-500=1800
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 500, 0, 300, 0, 100, 100, 0, 0);
        assert!(battle::round_am_a(&round) == 2200);
        assert!(battle::round_am_b(&round) == 1800);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multi_turn_burst_integrity_wears_down() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 300, 300, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Chip away at burst integrity: 100 per turn
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 0, 100, 100);
        assert!(battle::round_bi_a(&round) == 200);
        assert!(battle::round_bi_b(&round) == 200);

        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 0, 100, 100);
        assert!(battle::round_bi_a(&round) == 100);

        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 0, 100, 100);
        assert!(battle::round_bi_a(&round) == 0);
        assert!(battle::round_bi_b(&round) == 0);

        // Double burst KO
        let (is_over, finish_type, _, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 2); // BURST
        assert!(points == 0); // Draw

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 2. Death Spin trigger -- wobble when AM < 20% of initial
    // ===================================================================

    #[test]
    fun test_death_spin_wobble_activates() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Reduce B's AM to below 20% (2000) in one turn
        // B: 10000 - 0 decay - 9000 damage = 1000 (which is 10% < 20%)
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 9000, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_b(&round) == 1000);
        assert!(battle::round_wobble_b(&round) == 1); // Wobble activated

        // A should have no wobble (still at 10000)
        assert!(battle::round_wobble_a(&round) == 0);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_death_spin_wobble_increments_each_turn() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Drop B to 1500 (15% of 10000) in turn 1
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 8500, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_b(&round) == 1500);
        assert!(battle::round_wobble_b(&round) == 1);

        // Turn 2: B still in wobble zone, tiny damage to keep alive
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 100, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_b(&round) == 1400);
        assert!(battle::round_wobble_b(&round) == 2); // Incremented again

        // Turn 3: still in wobble
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 100, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_wobble_b(&round) == 3);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_death_spin_not_triggered_at_exactly_20_percent() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Drop B to exactly 2000 (20% of 10000)
        // Check: 2000 * 5 = 10000 which is NOT < 10000, so no wobble
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 8000, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_b(&round) == 2000);
        assert!(battle::round_wobble_b(&round) == 0); // No wobble at exactly 20%

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_death_spin_not_triggered_at_zero_am() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Kill B completely
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 10000, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_b(&round) == 0);
        // am_b * 5 = 0 which IS < 10000, but am_b == 0 so condition (am > 0) is false
        assert!(battle::round_wobble_b(&round) == 0);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_death_spin_both_wobbling() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Both get hit hard: both below 20%
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 9000, 9000, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_a(&round) == 1000);
        assert!(battle::round_am_b(&round) == 1000);
        assert!(battle::round_wobble_a(&round) == 1);
        assert!(battle::round_wobble_b(&round) == 1);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 3. Simultaneous KO -- both AMs reach 0 in same turn
    // ===================================================================

    #[test]
    fun test_simultaneous_ko_both_am_zero() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            1000, 1000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Both take lethal damage
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 1000, 1000, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_a(&round) == 0);
        assert!(battle::round_am_b(&round) == 0);

        let (is_over, finish_type, _, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 0); // SPIN finish (draw path)
        assert!(points == 0); // Draw: no points awarded

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_simultaneous_ko_both_burst_zero() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 100, 100, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Both burst integrity goes to 0
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 0, 100, 100);
        assert!(battle::round_bi_a(&round) == 0);
        assert!(battle::round_bi_b(&round) == 0);

        let (is_over, finish_type, _, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 2); // BURST draw
        assert!(points == 0);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_simultaneous_ko_exact_overkill() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            500, 500, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Overkill: damage exceeds AM
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 9999, 9999, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_a(&round) == 0);
        assert!(battle::round_am_b(&round) == 0);

        let (is_over, _, _, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(points == 0);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 4. Burst + Spin simultaneous -- one bursts, other spins out
    // ===================================================================

    #[test]
    fun test_burst_and_spin_out_same_turn() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            100, 10000,  // A has low AM
            500, 50,     // B has low burst integrity
            3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // A's AM goes to 0 (spin out), B's burst goes to 0 (burst)
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 100, 0, 0, 50);
        assert!(battle::round_am_a(&round) == 0);
        assert!(battle::round_bi_b(&round) == 0);

        // Burst has priority: B bursts, so A wins via burst (even though A is dead)
        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 2); // BURST
        assert!(winner_is_a == true);
        assert!(points == 2);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_a_bursts_b_spins_out() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 100,  // B has low AM
            50, 500,     // A has low burst integrity
            3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // A burst goes to 0, B's AM goes to 0
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 100, 50, 0);
        assert!(battle::round_bi_a(&round) == 0);
        assert!(battle::round_am_b(&round) == 0);

        // Burst priority: A's burst = 0, B's > 0 => B wins by burst
        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 2);
        assert!(winner_is_a == false);
        assert!(points == 2);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 5. Score accumulation -- multiple rounds to 7-point match
    // ===================================================================

    #[test]
    fun test_score_accumulation_spin_finishes_to_7() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // A wins 7 spin finishes (1 pt each)
        let mut i = 0;
        while (i < 6) {
            let is_over = battle::apply_round_result(&mut match_obj, true, 1);
            assert!(is_over == false);
            i = i + 1;
        };
        assert!(battle::score_a(&match_obj) == 6);

        // 7th win crosses threshold
        let is_over = battle::apply_round_result(&mut match_obj, true, 1);
        assert!(is_over == true);
        assert!(battle::score_a(&match_obj) == 7);
        assert!(battle::match_state(&match_obj) == 2);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_score_accumulation_mixed_finishes() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // A: spin(1) + burst(2) + xtreme(3) = 6 pts
        let _ = battle::apply_round_result(&mut match_obj, true, 1);
        assert!(battle::score_a(&match_obj) == 1);
        let _ = battle::apply_round_result(&mut match_obj, true, 2);
        assert!(battle::score_a(&match_obj) == 3);
        let _ = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(battle::score_a(&match_obj) == 6);

        // B wins a burst (2 pts)
        let _ = battle::apply_round_result(&mut match_obj, false, 2);
        assert!(battle::score_b(&match_obj) == 2);

        // A wins spin (1 pt) -> 7, match over
        let is_over = battle::apply_round_result(&mut match_obj, true, 1);
        assert!(is_over == true);
        assert!(battle::score_a(&match_obj) == 7);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_score_accumulation_b_wins_match() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // B wins: 3 + 2 + 2 = 7
        let _ = battle::apply_round_result(&mut match_obj, false, 3);
        assert!(battle::score_b(&match_obj) == 3);
        let _ = battle::apply_round_result(&mut match_obj, false, 2);
        assert!(battle::score_b(&match_obj) == 5);
        let is_over = battle::apply_round_result(&mut match_obj, false, 2);
        assert!(is_over == true);
        assert!(battle::score_b(&match_obj) == 7);
        assert!(battle::match_state(&match_obj) == 2);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_score_draw_round_no_points() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // Draw: 0 pts
        let is_over = battle::apply_round_result(&mut match_obj, true, 0);
        assert!(is_over == false);
        assert!(battle::score_a(&match_obj) == 0);
        assert!(battle::score_b(&match_obj) == 0);
        assert!(battle::rounds_played(&match_obj) == 1);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_score_overshoot_still_wins() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // A gets 6 pts, then xtreme finish (3) -> 9 >= 7, wins
        let _ = battle::apply_round_result(&mut match_obj, true, 3);
        let _ = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(battle::score_a(&match_obj) == 6);

        let is_over = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(is_over == true);
        assert!(battle::score_a(&match_obj) == 9); // Overshoots 7

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 6. Lock tightness edge cases -- 1 vs 5
    // ===================================================================

    #[test]
    fun test_lock_tightness_1_minimum() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500,
            1, 1, // Min lock tightness
            &clk, ctx,
        );
        assert!(battle::round_am_a(&round) == 10000);
        // Round created successfully with tightness 1
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_lock_tightness_5_maximum() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500,
            5, 5, // Max lock tightness
            &clk, ctx,
        );
        assert!(battle::round_am_a(&round) == 10000);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_lock_tightness_0_invalid() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500,
            0, 3, // 0 is invalid
            &clk, ctx,
        );
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_lock_tightness_6_invalid() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500,
            3, 6, // 6 is invalid
            &clk, ctx,
        );
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_lock_tightness_asymmetric_1_vs_5() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500,
            1, 5, // Asymmetric
            &clk, ctx,
        );
        // Both values are valid, round starts normally
        assert!(battle::round_am_a(&round) == 10000);
        assert!(battle::round_am_b(&round) == 10000);

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 7. Xtreme Finish scoring -- verify 3-point path
    // ===================================================================

    #[test]
    fun test_xtreme_finish_gives_3_points() {
        assert!(battle::finish_points(3) == 3); // FINISH_XTREME
    }

    #[test]
    fun test_xtreme_finish_wins_match_from_4() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // A at 4 pts, xtreme finish (3) -> 7, wins
        let _ = battle::apply_round_result(&mut match_obj, true, 2);
        let _ = battle::apply_round_result(&mut match_obj, true, 2);
        assert!(battle::score_a(&match_obj) == 4);

        let is_over = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(is_over == true);
        assert!(battle::score_a(&match_obj) == 7);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_xtreme_finish_wins_match_from_5() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // A at 5, xtreme -> 8 >= 7
        let _ = battle::apply_round_result(&mut match_obj, true, 2);
        let _ = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(battle::score_a(&match_obj) == 5);

        let is_over = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(is_over == true);
        assert!(battle::score_a(&match_obj) == 8);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 8. Over Finish scoring -- verify 2-point scoring
    // ===================================================================

    #[test]
    fun test_over_finish_gives_2_points() {
        assert!(battle::finish_points(1) == 2); // FINISH_OVER
    }

    #[test]
    fun test_over_finish_accumulation() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // 4 over finishes (2 pts each) = 8 >= 7
        let _ = battle::apply_round_result(&mut match_obj, true, 2);
        assert!(battle::score_a(&match_obj) == 2);
        let _ = battle::apply_round_result(&mut match_obj, true, 2);
        assert!(battle::score_a(&match_obj) == 4);
        let _ = battle::apply_round_result(&mut match_obj, true, 2);
        assert!(battle::score_a(&match_obj) == 6);
        let is_over = battle::apply_round_result(&mut match_obj, true, 2);
        assert!(is_over == true);
        assert!(battle::score_a(&match_obj) == 8);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 9. Full match simulation -- multiple rounds to completion
    // ===================================================================

    #[test]
    fun test_full_match_3_rounds_a_wins() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Round 1: bey 0 vs 0, A wins by spin finish
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round1 = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 2000, 500, 500, 3, 3, &clk, ctx,
        );
        assert!(battle::match_state(&match_obj) == 1);
        commit_and_resolve(&mut round1, &match_obj, &admin_cap, 2000, 0, 0, 0, 0, 0, 0, 0);
        let (is_over, _, winner_is_a, points) = battle::check_win(&round1, &match_obj);
        assert!(is_over == true && winner_is_a == true && points == 1);
        battle::destroy_round(round1);

        let match_over = battle::apply_round_result(&mut match_obj, true, 1);
        assert!(!match_over);
        assert!(battle::score_a(&match_obj) == 1);
        assert!(battle::match_state(&match_obj) == 0); // Back to BEY_SELECT

        // Round 2: bey 1 vs 1, A wins by burst finish
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round2 = battle::select_bey(
            &mut match_obj, 1, 1,
            10000, 10000, 500, 100, 3, 3, &clk, ctx,
        );
        commit_and_resolve(&mut round2, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 0, 0, 100);
        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round2, &match_obj);
        assert!(is_over == true && finish_type == 2 && winner_is_a == true && points == 2);
        battle::destroy_round(round2);

        let match_over = battle::apply_round_result(&mut match_obj, true, 2);
        assert!(!match_over);
        assert!(battle::score_a(&match_obj) == 3);

        // Round 3: bey 2 vs 2, A wins by xtreme (3 pts) -> score 6; need more
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round3 = battle::select_bey(
            &mut match_obj, 2, 2,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        commit_and_resolve(&mut round3, &match_obj, &admin_cap, 10000, 0, 0, 0, 0, 0, 0, 0);
        battle::destroy_round(round3);

        // Apply xtreme result (3 pts) -> 3+3 = 6, not yet 7
        let match_over = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(!match_over);
        assert!(battle::score_a(&match_obj) == 6);

        // Need one more spin win to reach 7
        let match_over = battle::apply_round_result(&mut match_obj, true, 1);
        assert!(match_over);
        assert!(battle::score_a(&match_obj) == 7);
        assert!(battle::match_state(&match_obj) == 2);

        admin::destroy_admin_cap(admin_cap);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_full_match_b_dominates() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // B wins 3 burst finishes (2+2+2=6), then 1 spin (1) = 7
        let _ = battle::apply_round_result(&mut match_obj, false, 2);
        let _ = battle::apply_round_result(&mut match_obj, false, 2);
        let _ = battle::apply_round_result(&mut match_obj, false, 2);
        assert!(battle::score_b(&match_obj) == 6);
        let is_over = battle::apply_round_result(&mut match_obj, false, 1);
        assert!(is_over == true);
        assert!(battle::score_b(&match_obj) == 7);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_full_match_back_and_forth() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // Back and forth scoring
        let _ = battle::apply_round_result(&mut match_obj, true, 1);  // A:1 B:0
        let _ = battle::apply_round_result(&mut match_obj, false, 2); // A:1 B:2
        let _ = battle::apply_round_result(&mut match_obj, true, 3);  // A:4 B:2
        let _ = battle::apply_round_result(&mut match_obj, false, 3); // A:4 B:5
        let _ = battle::apply_round_result(&mut match_obj, true, 0);  // Draw, A:4 B:5
        let _ = battle::apply_round_result(&mut match_obj, false, 2); // A:4 B:7

        assert!(battle::score_a(&match_obj) == 4);
        assert!(battle::score_b(&match_obj) == 7);
        assert!(battle::match_state(&match_obj) == 2);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 10. Commit double-submit prevention
    // ===================================================================

    #[test]
    #[expected_failure(abort_code = 4)]
    fun test_commit_double_submit_player_a() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"h1");
        // Double submit by A should fail
        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"h2");

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 4)]
    fun test_commit_double_submit_player_b() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"h1");
        // Double submit by B should fail
        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"h2");

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 11. Round state transitions -- COMMIT -> REVEAL -> COMMIT cycle
    // ===================================================================

    #[test]
    fun test_round_state_commit_reveal_commit_cycle() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Initial state: COMMIT (0)
        assert!(battle::round_state(&round) == 0);

        // A commits -> still COMMIT
        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"ha");
        assert!(battle::round_state(&round) == 0);

        // B commits -> transitions to REVEAL (1)
        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"hb");
        assert!(battle::round_state(&round) == 1);

        // Resolve -> back to COMMIT (0)
        battle::resolve_turn(&admin_cap, &mut round, 0, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_state(&round) == 0);
        assert!(battle::round_turn(&round) == 1);

        // Next cycle: COMMIT -> REVEAL -> COMMIT
        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"ha2");
        assert!(battle::round_state(&round) == 0);
        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"hb2");
        assert!(battle::round_state(&round) == 1);
        battle::resolve_turn(&admin_cap, &mut round, 0, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_state(&round) == 0);
        assert!(battle::round_turn(&round) == 2);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_resolve_turn_in_commit_state_fails() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Try to resolve while still in COMMIT state (no commits yet)
        battle::set_round_state_for_testing(&mut round, 1); // Force to REVEAL for setup
        battle::resolve_turn(&admin_cap, &mut round, 0, 0, 0, 0, 0, 0, 0, 0);
        // Now in COMMIT, try resolving again => should fail
        battle::resolve_turn(&admin_cap, &mut round, 0, 0, 0, 0, 0, 0, 0, 0);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_commit_in_reveal_state_fails() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        // Move to REVEAL state
        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"ha");
        battle::commit_action(&mut round, PLAYER_B, &match_obj, b"hb");
        assert!(battle::round_state(&round) == 1); // REVEAL

        // Trying to commit in REVEAL state should fail
        battle::commit_action(&mut round, PLAYER_A, &match_obj, b"again");

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 12. Match state transitions -- BEY_SELECT -> IN_ROUND -> COMPLETE
    // ===================================================================

    #[test]
    fun test_match_state_bey_select_to_in_round() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        assert!(battle::match_state(&match_obj) == 0); // BEY_SELECT

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        assert!(battle::match_state(&match_obj) == 1); // IN_ROUND

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_match_state_in_round_back_to_bey_select() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        assert!(battle::match_state(&match_obj) == 1);
        battle::destroy_round(round);

        // Apply a non-winning result -> back to BEY_SELECT
        let is_over = battle::apply_round_result(&mut match_obj, true, 1);
        assert!(!is_over);
        assert!(battle::match_state(&match_obj) == 0); // Back to BEY_SELECT

        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_match_state_to_complete() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );

        // Win enough to complete
        let _ = battle::apply_round_result(&mut match_obj, true, 3);
        let _ = battle::apply_round_result(&mut match_obj, true, 3);
        let is_over = battle::apply_round_result(&mut match_obj, true, 3);
        assert!(is_over == true);
        assert!(battle::match_state(&match_obj) == 2); // COMPLETE

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_rounds_played_increments() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        assert!(battle::rounds_played(&match_obj) == 0);

        let _ = battle::apply_round_result(&mut match_obj, true, 1);
        assert!(battle::rounds_played(&match_obj) == 1);

        let _ = battle::apply_round_result(&mut match_obj, false, 2);
        assert!(battle::rounds_played(&match_obj) == 2);

        let _ = battle::apply_round_result(&mut match_obj, true, 0);
        assert!(battle::rounds_played(&match_obj) == 3);

        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // 13. Bey used tracking -- can't reuse same bey
    // ===================================================================

    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_bey_reuse_a_fails() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // Round 1: use bey index 0
        let ctx = test_scenario::ctx(&mut scenario);
        let round1 = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        battle::destroy_round(round1);
        let _ = battle::apply_round_result(&mut match_obj, true, 1);

        // Round 2: try to reuse bey index 0 for player A -> EBeyAlreadyUsed
        let ctx = test_scenario::ctx(&mut scenario);
        let round2 = battle::select_bey(
            &mut match_obj, 0, 1,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        battle::destroy_round(round2);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_bey_reuse_b_fails() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // Round 1: use bey index 2 for B
        let ctx = test_scenario::ctx(&mut scenario);
        let round1 = battle::select_bey(
            &mut match_obj, 0, 2,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        battle::destroy_round(round1);
        let _ = battle::apply_round_result(&mut match_obj, true, 1);

        // Round 2: B tries to reuse index 2 -> EBeyAlreadyUsed
        let ctx = test_scenario::ctx(&mut scenario);
        let round2 = battle::select_bey(
            &mut match_obj, 1, 2,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        battle::destroy_round(round2);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_bey_different_indices_ok() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // Round 1: bey 0 vs 0
        let ctx = test_scenario::ctx(&mut scenario);
        let round1 = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        battle::destroy_round(round1);
        let _ = battle::apply_round_result(&mut match_obj, true, 1);

        // Round 2: bey 1 vs 1 (different) -- should succeed
        let ctx = test_scenario::ctx(&mut scenario);
        let round2 = battle::select_bey(
            &mut match_obj, 1, 1,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        battle::destroy_round(round2);
        let _ = battle::apply_round_result(&mut match_obj, true, 1);

        // Round 3: bey 2 vs 2 (different) -- should succeed
        let ctx = test_scenario::ctx(&mut scenario);
        let round3 = battle::select_bey(
            &mut match_obj, 2, 2,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        battle::destroy_round(round3);

        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3)]
    fun test_bey_index_out_of_bounds() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        // Index 3 is out of bounds for a 3-element deck
        let round = battle::select_bey(
            &mut match_obj, 3, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Additional edge case tests
    // ===================================================================

    #[test]
    fun test_resolve_turn_zero_all_params() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // All zeros: nothing changes except turn counter and state
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_a(&round) == 10000);
        assert!(battle::round_am_b(&round) == 10000);
        assert!(battle::round_bi_a(&round) == 500);
        assert!(battle::round_bi_b(&round) == 500);
        assert!(battle::round_turn(&round) == 1);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_resolve_turn_massive_overkill_damage() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            100, 100, 50, 50, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Massive damage, should clamp to 0 not underflow
        commit_and_resolve(&mut round, &match_obj, &admin_cap,
            999999, 999999, 999999, 999999, 999999, 999999, 999999, 999999);
        assert!(battle::round_am_a(&round) == 0);
        assert!(battle::round_am_b(&round) == 0);
        assert!(battle::round_bi_a(&round) == 0);
        assert!(battle::round_bi_b(&round) == 0);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_check_win_no_winner_high_am() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Small damage, no win condition met
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 10, 10, 0, 0, 0, 0, 0, 0);
        let (is_over, _, _, _) = battle::check_win(&round, &match_obj);
        assert!(is_over == false);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_spin_finish_b_wins() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            100, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // B kills A's AM
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 200, 0, 0, 0, 0, 0, 0);
        assert!(battle::round_am_a(&round) == 0);

        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 0);
        assert!(winner_is_a == false);
        assert!(points == 1);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_burst_finish_b_wins() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 50, 500, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Kill A's burst integrity
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 0, 50, 0);

        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 2);
        assert!(winner_is_a == false);
        assert!(points == 2);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_finish_points_unknown_returns_0() {
        assert!(battle::finish_points(99) == 0);
        assert!(battle::finish_points(4) == 0);
        assert!(battle::finish_points(255) == 0);
    }

    #[test]
    fun test_zones_initial_at_center() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        assert!(battle::round_zone_a(&round) == 0);
        assert!(battle::round_zone_b(&round) == 0);

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_wobble_initial_zero() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        assert!(battle::round_wobble_a(&round) == 0);
        assert!(battle::round_wobble_b(&round) == 0);

        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_select_bey_in_wrong_state() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // First select succeeds
        let ctx = test_scenario::ctx(&mut scenario);
        let round1 = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );
        // Match is now IN_ROUND, trying to select again should fail
        let ctx = test_scenario::ctx(&mut scenario);
        let round2 = battle::select_bey(
            &mut match_obj, 1, 1,
            10000, 10000, 500, 500, 3, 3, &clk, ctx,
        );

        battle::destroy_round(round1);
        battle::destroy_round(round2);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    // ===================================================================
    // Multi-turn battle with all damage channels
    // ===================================================================

    #[test]
    fun test_multi_turn_all_damage_channels() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            5000, 5000, 300, 300, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // Turn 1: All channels active
        // AM_A: 5000 - decay(100) - damage_b_to_a(200) - recoil_a(50) = 4650
        // AM_B: 5000 - decay(100) - damage_a_to_b(300) - recoil_b(30) = 4570
        // BI_A: 300 - 40 = 260
        // BI_B: 300 - 60 = 240
        commit_and_resolve(&mut round, &match_obj, &admin_cap,
            300, 200, 50, 30, 100, 100, 40, 60);
        assert!(battle::round_am_a(&round) == 4650);
        assert!(battle::round_am_b(&round) == 4570);
        assert!(battle::round_bi_a(&round) == 260);
        assert!(battle::round_bi_b(&round) == 240);

        // Turn 2: same params
        commit_and_resolve(&mut round, &match_obj, &admin_cap,
            300, 200, 50, 30, 100, 100, 40, 60);
        assert!(battle::round_am_a(&round) == 4300);
        assert!(battle::round_am_b(&round) == 4140);
        assert!(battle::round_bi_a(&round) == 220);
        assert!(battle::round_bi_b(&round) == 180);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_10_turn_attrition_battle() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            20000, 20000, 1000, 1000, 3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // 10 turns of moderate symmetric damage
        let mut i = 0;
        while (i < 10) {
            commit_and_resolve(&mut round, &match_obj, &admin_cap,
                500, 500, 50, 50, 200, 200, 30, 30);
            i = i + 1;
        };

        // AM: 20000 - 10*(200+500+50) = 20000 - 7500 = 12500
        assert!(battle::round_am_a(&round) == 12500);
        assert!(battle::round_am_b(&round) == 12500);
        // BI: 1000 - 10*30 = 700
        assert!(battle::round_bi_a(&round) == 700);
        assert!(battle::round_bi_b(&round) == 700);
        assert!(battle::round_turn(&round) == 10);

        let (is_over, _, _, _) = battle::check_win(&round, &match_obj);
        assert!(is_over == false);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_burst_priority_over_spin() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let (deck_a, deck_b, stadium_id) = create_test_ids(&mut scenario);
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = battle::create_match(
            PLAYER_A, PLAYER_B, stadium_id, deck_a, deck_b, ctx,
        );
        let clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let ctx = test_scenario::ctx(&mut scenario);
        let mut round = battle::select_bey(
            &mut match_obj, 0, 0,
            10000, 100,
            500, 50,
            3, 3, &clk, ctx,
        );
        let admin_cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));

        // B: both AM -> 0 and burst -> 0 (via spin_decay + burst_loss)
        // A: burst intact, AM intact
        commit_and_resolve(&mut round, &match_obj, &admin_cap, 0, 0, 0, 0, 0, 100, 0, 50);
        assert!(battle::round_am_b(&round) == 0);
        assert!(battle::round_bi_b(&round) == 0);
        assert!(battle::round_bi_a(&round) == 500);

        // Burst check comes first: B burst=0, A burst=500 -> A wins by burst (2 pts)
        let (is_over, finish_type, winner_is_a, points) = battle::check_win(&round, &match_obj);
        assert!(is_over == true);
        assert!(finish_type == 2); // BURST has priority
        assert!(winner_is_a == true);
        assert!(points == 2);

        admin::destroy_admin_cap(admin_cap);
        battle::destroy_round(round);
        clock::destroy_for_testing(clk);
        battle::destroy_match(match_obj);
        test_scenario::end(scenario);
    }
}
