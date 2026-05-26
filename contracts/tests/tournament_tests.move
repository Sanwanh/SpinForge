#[test_only]
module spinforge::tournament_tests {
    use sui::test_scenario;
    use spinforge::tournament;

    const ORGANIZER: address = @0xA;
    const PLAYER_1: address = @0xB;
    const PLAYER_2: address = @0xC;
    const PLAYER_3: address = @0xD;
    const PLAYER_4: address = @0xE;

    #[test]
    fun test_create_tournament() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);

        let tournament = tournament::create_tournament(
            b"Grand Prix", 8, 10_000_000_000, ctx,
        );

        assert!(tournament::organizer(&tournament) == ORGANIZER);
        assert!(tournament::max_players(&tournament) == 8);
        assert!(tournament::entry_fee(&tournament) == 10_000_000_000);
        assert!(tournament::prize_pool(&tournament) == 0);
        assert!(tournament::player_count(&tournament) == 0);
        assert!(tournament::state(&tournament) == 0); // REGISTRATION

        tournament::destroy_for_testing(tournament);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_tournament_bracket_advance() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut tournament = tournament::create_tournament(
            b"Test Cup", 4, 0, ctx,
        );

        // Add players via test helper
        tournament::add_player_for_testing(&mut tournament, PLAYER_1);
        tournament::add_player_for_testing(&mut tournament, PLAYER_2);
        tournament::add_player_for_testing(&mut tournament, PLAYER_3);
        tournament::add_player_for_testing(&mut tournament, PLAYER_4);

        // Start tournament
        tournament::start_tournament(&mut tournament, test_scenario::ctx(&mut scenario));

        // Advance round 1: 2 winners from 4 players
        let winners_r1 = vector[PLAYER_1, PLAYER_3];
        tournament::advance_round(
            &mut tournament, winners_r1,
            test_scenario::ctx(&mut scenario),
        );
        assert!(tournament::current_round(&tournament) == 2);

        // Advance round 2: 1 winner (champion)
        let winners_r2 = vector[PLAYER_1];
        tournament::advance_round(
            &mut tournament, winners_r2,
            test_scenario::ctx(&mut scenario),
        );
        assert!(tournament::state(&tournament) == 2); // COMPLETE

        tournament::destroy_for_testing(tournament);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 5)]
    fun test_start_tournament_not_enough_players() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut tournament = tournament::create_tournament(
            b"Empty Cup", 4, 0, ctx,
        );

        // Try to start with 0 players - should fail
        tournament::start_tournament(&mut tournament, test_scenario::ctx(&mut scenario));

        tournament::destroy_for_testing(tournament);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0)]
    fun test_advance_round_not_organizer() {
        let mut scenario = test_scenario::begin(ORGANIZER);
        let ctx = test_scenario::ctx(&mut scenario);

        let mut tournament = tournament::create_tournament(
            b"Test", 4, 0, ctx,
        );

        // Add players and start
        tournament::add_player_for_testing(&mut tournament, PLAYER_1);
        tournament::add_player_for_testing(&mut tournament, PLAYER_2);
        tournament::start_tournament(&mut tournament, test_scenario::ctx(&mut scenario));

        // Switch to non-organizer
        test_scenario::next_tx(&mut scenario, PLAYER_1);
        let winners = vector[PLAYER_1];
        tournament::advance_round(
            &mut tournament, winners,
            test_scenario::ctx(&mut scenario),
        );

        tournament::destroy_for_testing(tournament);
        test_scenario::end(scenario);
    }
}
