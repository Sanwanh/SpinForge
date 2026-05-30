#[test_only]
/// M-1: the AdminCap ban list is now read by the admin-relayed value-mint entry
/// points that carry an explicit player address — register_rotor (`recipient`)
/// and pack::open_pack (`recipient`). Because the SPARK TreasuryCap is admin-owned,
/// these calls are always admin-signed, so the gate checks the player param, not
/// ctx.sender(). open_pack uses the identical `is_banned(config, recipient)` check
/// (verified live); register covers the invariant here.
module spinforge::admin_gate_tests {
    use sui::test_scenario;
    use spinforge::admin;
    use spinforge::register;

    const ADMIN_ADDR: address = @0xAD;
    const BANNED: address = @0xBAD;
    const CLEAN: address = @0xCAFE;

    #[test]
    #[expected_failure(abort_code = 0)] // register::EPlayerBanned
    fun test_register_rotor_rejects_banned_recipient() {
        let mut scenario = test_scenario::begin(ADMIN_ADDR);
        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let mut config = admin::create_game_config_for_testing(test_scenario::ctx(&mut scenario));
        admin::ban_player(&cap, &mut config, BANNED);

        register::register_rotor(
            &cap, &config,
            std::string::utf8(b"Blade"), 0, 0, 0, 5, 50,
            std::string::utf8(b"Bit"), 0,
            std::string::utf8(b"Rotor"),
            BANNED,
            test_scenario::ctx(&mut scenario),
        );

        admin::destroy_admin_cap(cap);
        admin::destroy_game_config(config);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_register_rotor_allows_unbanned() {
        let mut scenario = test_scenario::begin(ADMIN_ADDR);
        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let config = admin::create_game_config_for_testing(test_scenario::ctx(&mut scenario));

        register::register_rotor(
            &cap, &config,
            std::string::utf8(b"Blade"), 0, 0, 0, 5, 50,
            std::string::utf8(b"Bit"), 0,
            std::string::utf8(b"Rotor"),
            CLEAN,
            test_scenario::ctx(&mut scenario),
        );

        // Bey was minted and transferred to the clean recipient.
        test_scenario::next_tx(&mut scenario, CLEAN);
        assert!(test_scenario::has_most_recent_for_address<spinforge::bey::Bey>(CLEAN));

        admin::destroy_admin_cap(cap);
        admin::destroy_game_config(config);
        test_scenario::end(scenario);
    }
}
