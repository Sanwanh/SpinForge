#[test_only]
module spinforge::battle_record_tests {
    use sui::test_scenario;
    use sui::clock;
    use spinforge::battle_record;
    use spinforge::admin;

    const PLAYER_A: address = @0xA;
    const PLAYER_B: address = @0xB;

    // H-4: create requires &AdminCap (compile-enforced — arbitrary players cannot
    // call it without the cap). Happy path: the backend creates a record, both
    // participants confirm, and only then does it become committed.
    #[test]
    fun test_create_then_dual_confirm_commits() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let test_clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        let rotor_a = object::id_from_address(@0x100);
        let rotor_b = object::id_from_address(@0x200);

        let mut record = battle_record::create(
            &cap,
            PLAYER_A, PLAYER_B,
            rotor_a, rotor_b,
            PLAYER_A, // winner
            3, 7, 5, // finish_type, score_a, score_b
            &test_clock,
            test_scenario::ctx(&mut scenario),
        );

        assert!(!battle_record::is_committed(&record));
        assert!(battle_record::winner(&record) == PLAYER_A);
        assert!(battle_record::score_a(&record) == 7);

        // First participant confirms — still not committed.
        battle_record::confirm(&mut record, test_scenario::ctx(&mut scenario));
        assert!(!battle_record::is_committed(&record));

        // Second participant confirms — now committed (trustworthy off-chain).
        test_scenario::next_tx(&mut scenario, PLAYER_B);
        battle_record::confirm(&mut record, test_scenario::ctx(&mut scenario));
        assert!(battle_record::is_committed(&record));

        clock::destroy_for_testing(test_clock);
        battle_record::destroy_for_testing(record);
        admin::destroy_admin_cap(cap);
        test_scenario::end(scenario);
    }

    // A non-participant cannot confirm a record (existing guard, now covered).
    #[test]
    #[expected_failure(abort_code = 0)] // battle_record::ENotParticipant
    fun test_confirm_rejects_non_participant() {
        let mut scenario = test_scenario::begin(PLAYER_A);
        let cap = admin::create_admin_cap_for_testing(test_scenario::ctx(&mut scenario));
        let test_clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));

        let mut record = battle_record::create(
            &cap,
            PLAYER_A, PLAYER_B,
            object::id_from_address(@0x100), object::id_from_address(@0x200),
            PLAYER_A, 0, 7, 0,
            &test_clock,
            test_scenario::ctx(&mut scenario),
        );

        // @0xC is neither participant — must abort.
        test_scenario::next_tx(&mut scenario, @0xC);
        battle_record::confirm(&mut record, test_scenario::ctx(&mut scenario));

        clock::destroy_for_testing(test_clock);
        battle_record::destroy_for_testing(record);
        admin::destroy_admin_cap(cap);
        test_scenario::end(scenario);
    }
}
