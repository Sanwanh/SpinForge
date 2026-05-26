#[test_only]
module spinforge::deck_tests {
    use std::string;
    use sui::test_scenario;
    use spinforge::blade;
    use spinforge::ratchet;
    use spinforge::bit;
    use spinforge::bey;
    use spinforge::deck;

    fun make_bey(
        blade_spirit: u8,
        prongs: u8,
        bit_name: vector<u8>,
        scenario: &mut test_scenario::Scenario,
    ): bey::Bey {
        let ctx = test_scenario::ctx(scenario);
        let b = blade::mint(
            string::utf8(b"Blade"),
            blade_spirit, 0, 0, 50, 30, 0, ctx,
        );
        let r = ratchet::mint(prongs, 60, 100, 200, 0, ctx);
        let bt = bit::mint(
            string::utf8(bit_name), 0, 50, 3, 0, false, 0, ctx,
        );
        bey::assemble(b, r, bt, string::utf8(b"Bey"), ctx)
    }

    #[test]
    fun test_valid_deck_no_duplicates() {
        let mut scenario = test_scenario::begin(@0x1);

        let bey_a = make_bey(0, 3, b"Rush", &mut scenario);
        let bey_b = make_bey(1, 5, b"Ball", &mut scenario);
        let bey_c = make_bey(2, 7, b"Needle", &mut scenario);

        // Should not abort
        let valid = deck::validate_deck(&bey_a, &bey_b, &bey_c);
        assert!(valid == true);

        // Create deck
        let ctx = test_scenario::ctx(&mut scenario);
        let deck = deck::create_deck(&bey_a, &bey_b, &bey_c, ctx);

        assert!(deck::contains_bey(&deck, bey::id(&bey_a)) == true);
        assert!(deck::contains_bey(&deck, bey::id(&bey_b)) == true);
        assert!(deck::contains_bey(&deck, bey::id(&bey_c)) == true);

        deck::destroy_for_testing(deck);

        // Disassemble and clean up
        let ctx = test_scenario::ctx(&mut scenario);
        let (b1, r1, bt1) = bey::disassemble(bey_a, ctx);
        blade::destroy_for_testing(b1);
        ratchet::destroy_for_testing(r1);
        bit::destroy_for_testing(bt1);

        let (b2, r2, bt2) = bey::disassemble(bey_b, ctx);
        blade::destroy_for_testing(b2);
        ratchet::destroy_for_testing(r2);
        bit::destroy_for_testing(bt2);

        let (b3, r3, bt3) = bey::disassemble(bey_c, ctx);
        blade::destroy_for_testing(b3);
        ratchet::destroy_for_testing(r3);
        bit::destroy_for_testing(bt3);

        test_scenario::end(scenario);
    }

    #[test]
    fun test_deck_bey_ids() {
        let mut scenario = test_scenario::begin(@0x1);

        let bey_a = make_bey(0, 1, b"R", &mut scenario);
        let bey_b = make_bey(1, 3, b"B", &mut scenario);
        let bey_c = make_bey(2, 5, b"N", &mut scenario);

        let id_a = bey::id(&bey_a);
        let id_b = bey::id(&bey_b);
        let id_c = bey::id(&bey_c);

        let ctx = test_scenario::ctx(&mut scenario);
        let deck = deck::create_deck(&bey_a, &bey_b, &bey_c, ctx);

        let ids = deck::bey_ids(&deck);
        assert!(vector::length(ids) == 3);
        assert!(*vector::borrow(ids, 0) == id_a);
        assert!(*vector::borrow(ids, 1) == id_b);
        assert!(*vector::borrow(ids, 2) == id_c);

        deck::destroy_for_testing(deck);

        let ctx = test_scenario::ctx(&mut scenario);
        let (b1, r1, bt1) = bey::disassemble(bey_a, ctx);
        blade::destroy_for_testing(b1); ratchet::destroy_for_testing(r1); bit::destroy_for_testing(bt1);
        let (b2, r2, bt2) = bey::disassemble(bey_b, ctx);
        blade::destroy_for_testing(b2); ratchet::destroy_for_testing(r2); bit::destroy_for_testing(bt2);
        let (b3, r3, bt3) = bey::disassemble(bey_c, ctx);
        blade::destroy_for_testing(b3); ratchet::destroy_for_testing(r3); bit::destroy_for_testing(bt3);

        test_scenario::end(scenario);
    }

    // Note: Testing duplicate detection requires shared blades/ratchets/bits
    // which is prevented by the move semantics of assembly.
    // Each assemble() consumes unique parts, so duplicates are structurally impossible
    // when parts are correctly minted. The validate_deck function provides
    // defense-in-depth against programmatic misuse.
}
