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
}
