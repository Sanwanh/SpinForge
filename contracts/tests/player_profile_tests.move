#[test_only]
/// H-RT-4: record_battle_result now requires &AdminCap (compile-enforced — a
/// player cannot call it without the cap, so self-inflated ELO is impossible).
/// These tests cover: correct owner attribution, win settlement (wins/elo/
/// xtreme/burst counters), and loss settlement (elo decrement + zero floor).
module spinforge::player_profile_tests {
    use sui::test_scenario;
    use sui::clock;
    use std::string;
    use spinforge::player_profile;
    use spinforge::admin;

    const PLAYER: address = @0xA;

    #[test]
    fun test_create_sets_owner_and_defaults() {
        let mut scenario = test_scenario::begin(PLAYER);
        let test_clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        // The backend (admin) signs, so owner must come from the explicit arg,
        // not ctx.sender().
        let profile = player_profile::create(
            string::utf8(b"Blader"),
            PLAYER,
            &test_clock,
            test_scenario::ctx(&mut scenario),
        );

        assert!(player_profile::owner(&profile) == PLAYER, 0);
        assert!(player_profile::elo(&profile) == 1000, 1);
        assert!(player_profile::wins(&profile) == 0, 2);
        assert!(player_profile::total_battles(&profile) == 0, 3);

        player_profile::destroy_for_testing(profile);
        clock::destroy_for_testing(test_clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_admin_records_win() {
        let mut scenario = test_scenario::begin(PLAYER);
        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let test_clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let mut profile = player_profile::create(
            string::utf8(b"Blader"), PLAYER, &test_clock,
            test_scenario::ctx(&mut scenario),
        );

        // Xtreme + burst win.
        player_profile::record_battle_result(&cap, &mut profile, true, true, true);

        assert!(player_profile::wins(&profile) == 1, 0);
        assert!(player_profile::elo(&profile) == 1025, 1);
        assert!(player_profile::total_battles(&profile) == 1, 2);
        assert!(player_profile::xtreme_finishes(&profile) == 1, 3);
        assert!(player_profile::burst_finishes(&profile) == 1, 4);

        player_profile::destroy_for_testing(profile);
        admin::destroy_admin_cap(cap);
        clock::destroy_for_testing(test_clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_admin_records_loss_decrements_elo() {
        let mut scenario = test_scenario::begin(PLAYER);
        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let test_clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let mut profile = player_profile::create(
            string::utf8(b"Blader"), PLAYER, &test_clock,
            test_scenario::ctx(&mut scenario),
        );

        player_profile::record_battle_result(&cap, &mut profile, false, false, false);

        assert!(player_profile::losses(&profile) == 1, 0);
        assert!(player_profile::elo(&profile) == 975, 1);
        assert!(player_profile::wins(&profile) == 0, 2);

        player_profile::destroy_for_testing(profile);
        admin::destroy_admin_cap(cap);
        clock::destroy_for_testing(test_clock);
        test_scenario::end(scenario);
    }
}
