#[test_only]
/// Web2-hybrid relay entry points (`*_for`). These are admin/platform-relayed:
/// the platform signer is ctx.sender() and owns every resulting object, while
/// Postgres attributes ownership via the pseudonymous `recipient_subject` and the
/// outbox `operation_id` carried in each event. Covered here:
///   - open_pack_for:        custody receives 5 parts; banned subject is NOT gated
///                           (banning is enforced off-chain).
///   - register_rotor_for:   custody receives the Bey.
///   - create_committed:     returns an ALREADY-committed record with subjects.
module spinforge::relay_for_tests {
    use sui::test_scenario;
    use sui::clock;
    use sui::coin::TreasuryCap;
    use sui::random::{Self, Random};
    use spinforge::admin;
    use spinforge::pack;
    use spinforge::register;
    use spinforge::battle_record;
    use spinforge::blade::Blade;
    use spinforge::bey::Bey;
    use spinforge::spark_token::{Self, SPARK_TOKEN};

    const CUSTODY: address = @0xC0;
    // A pseudonymous attribution subject (sha256-derived off-chain); never signs.
    const SUBJECT_A: address = @0xA11CE;
    const SUBJECT_B: address = @0xB0B;
    const BANNED_SUBJECT: address = @0xBAD;
    const OP_ID: vector<u8> = b"op-0001";

    // ===== open_pack_for =====

    // Happy path: the relay opens a pack and all 5 parts land in platform custody
    // (ctx.sender()). No SPARK is burned (pack cost is a DB ledger debit).
    #[test]
    fun test_open_pack_for_mints_to_custody() {
        // sui::random::create AND update_randomness_state assert ctx.sender() ==
        // @0x0, so the shared Random must be created and seeded in system (@0x0)
        // txs, then we switch to CUSTODY to run the relay call.
        let mut scenario = test_scenario::begin(@0x0);
        random::create_for_testing(test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, @0x0);
        let mut random_state = test_scenario::take_shared<Random>(&scenario);
        random_state.update_randomness_state_for_testing(
            0,
            x"1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F",
            test_scenario::ctx(&mut scenario),
        );

        // A real TreasuryCap minted to CUSTODY by the publish tx.
        test_scenario::next_tx(&mut scenario, CUSTODY);
        spark_token::init_for_testing(test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, CUSTODY);
        let mut treasury = test_scenario::take_from_sender<TreasuryCap<SPARK_TOKEN>>(&scenario);
        let config = admin::create_game_config_for_testing(test_scenario::ctx(&mut scenario));

        pack::open_pack_for(
            &mut treasury,
            &config,
            SUBJECT_A,
            OP_ID,
            &random_state,
            test_scenario::ctx(&mut scenario),
        );

        // Custody now holds at least one Blade (the 5 parts were transferred to it).
        test_scenario::next_tx(&mut scenario, CUSTODY);
        assert!(test_scenario::has_most_recent_for_address<Blade>(CUSTODY));

        test_scenario::return_to_sender(&scenario, treasury);
        admin::destroy_game_config(config);
        test_scenario::return_shared(random_state);
        test_scenario::end(scenario);
    }

    // A banned subject is NOT rejected by open_pack_for — the custody address is
    // ctx.sender() and ban enforcement is off-chain. (Negative-of-a-guard: proves
    // the on-chain path does not abort even when the attribution subject is banned.)
    #[test]
    fun test_open_pack_for_ignores_banned_subject() {
        let mut scenario = test_scenario::begin(@0x0);
        random::create_for_testing(test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, @0x0);
        let mut random_state = test_scenario::take_shared<Random>(&scenario);
        random_state.update_randomness_state_for_testing(
            0,
            x"2F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1A",
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::next_tx(&mut scenario, CUSTODY);
        spark_token::init_for_testing(test_scenario::ctx(&mut scenario));
        test_scenario::next_tx(&mut scenario, CUSTODY);
        let mut treasury = test_scenario::take_from_sender<TreasuryCap<SPARK_TOKEN>>(&scenario);

        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let mut config = admin::create_game_config_for_testing(test_scenario::ctx(&mut scenario));
        admin::ban_player(&cap, &mut config, BANNED_SUBJECT);

        // Must NOT abort despite BANNED_SUBJECT being on the ban list.
        pack::open_pack_for(
            &mut treasury,
            &config,
            BANNED_SUBJECT,
            OP_ID,
            &random_state,
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::next_tx(&mut scenario, CUSTODY);
        assert!(test_scenario::has_most_recent_for_address<Blade>(CUSTODY));

        test_scenario::return_to_sender(&scenario, treasury);
        admin::destroy_admin_cap(cap);
        admin::destroy_game_config(config);
        test_scenario::return_shared(random_state);
        test_scenario::end(scenario);
    }

    // ===== register_rotor_for =====

    // Happy path: the Bey is minted to platform custody (ctx.sender()).
    #[test]
    fun test_register_rotor_for_mints_to_custody() {
        let mut scenario = test_scenario::begin(CUSTODY);
        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let config = admin::create_game_config_for_testing(test_scenario::ctx(&mut scenario));

        register::register_rotor_for(
            &cap, &config,
            SUBJECT_A,
            OP_ID,
            std::string::utf8(b"Blade"), 0, 0, 0, 5, 50,
            std::string::utf8(b"Bit"), 0,
            std::string::utf8(b"Rotor"),
            test_scenario::ctx(&mut scenario),
        );

        test_scenario::next_tx(&mut scenario, CUSTODY);
        assert!(test_scenario::has_most_recent_for_address<Bey>(CUSTODY));

        admin::destroy_admin_cap(cap);
        admin::destroy_game_config(config);
        test_scenario::end(scenario);
    }

    // ===== create_committed =====

    // Happy path: the relay mints an already-committed record with the agreed
    // result and pseudonymous subjects; it is committed immediately.
    #[test]
    fun test_create_committed_is_committed() {
        let mut scenario = test_scenario::begin(CUSTODY);
        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let test_clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let rotor_a = object::id_from_address(@0x100);
        let rotor_b = object::id_from_address(@0x200);

        let record = battle_record::create_committed(
            &cap,
            SUBJECT_A, SUBJECT_B,
            rotor_a, rotor_b,
            SUBJECT_A, // winner subject
            3, 7, 5, // finish_type, score_a, score_b
            180, // duration_seconds
            OP_ID,
            &test_clock,
            test_scenario::ctx(&mut scenario),
        );

        // Already committed — no on-chain confirm() needed.
        assert!(battle_record::is_committed(&record));
        assert!(battle_record::winner(&record) == SUBJECT_A);
        assert!(battle_record::player_a(&record) == SUBJECT_A);
        assert!(battle_record::player_b(&record) == SUBJECT_B);
        assert!(battle_record::score_a(&record) == 7);
        assert!(battle_record::score_b(&record) == 5);
        assert!(battle_record::finish_type(&record) == 3);
        assert!(battle_record::duration_seconds(&record) == 180);

        clock::destroy_for_testing(test_clock);
        battle_record::destroy_for_testing(record);
        admin::destroy_admin_cap(cap);
        test_scenario::end(scenario);
    }
}
