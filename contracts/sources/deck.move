module spinforge::deck {
    use spinforge::bey::{Self, Bey};
    use spinforge::blade;
    use spinforge::ratchet;
    use spinforge::bit;

    // ===== Error Codes =====
    const EDeckSizeInvalid: u64 = 0;
    const EDuplicateBlade: u64 = 1;
    const EDuplicateRatchet: u64 = 2;
    const EDuplicateBit: u64 = 3;

    // ===== Struct =====

    /// A validated 3on3 deck. Stores IDs of the 3 Beys.
    public struct Deck has key, store {
        id: UID,
        bey_ids: vector<ID>,
        owner: address,
    }

    // ===== Validation =====

    /// Validate that 3 Beys form a legal deck (no duplicate parts).
    /// Returns blade/ratchet/bit IDs for each bey to check uniqueness.
    public fun validate_deck(
        bey_a: &Bey,
        bey_b: &Bey,
        bey_c: &Bey,
    ): bool {
        // Collect blade IDs
        let blade_a = blade::id(bey::borrow_blade(bey_a));
        let blade_b = blade::id(bey::borrow_blade(bey_b));
        let blade_c = blade::id(bey::borrow_blade(bey_c));

        // Collect ratchet IDs
        let ratchet_a = ratchet::id(bey::borrow_ratchet(bey_a));
        let ratchet_b = ratchet::id(bey::borrow_ratchet(bey_b));
        let ratchet_c = ratchet::id(bey::borrow_ratchet(bey_c));

        // Collect bit IDs
        let bit_a = bit::id(bey::borrow_bit(bey_a));
        let bit_b = bit::id(bey::borrow_bit(bey_b));
        let bit_c = bit::id(bey::borrow_bit(bey_c));

        // Check no duplicate blades
        assert!(blade_a != blade_b && blade_a != blade_c && blade_b != blade_c, EDuplicateBlade);

        // Check no duplicate ratchets
        assert!(ratchet_a != ratchet_b && ratchet_a != ratchet_c && ratchet_b != ratchet_c, EDuplicateRatchet);

        // Check no duplicate bits
        assert!(bit_a != bit_b && bit_a != bit_c && bit_b != bit_c, EDuplicateBit);

        true
    }

    /// Create a validated deck from 3 Beys.
    public fun create_deck(
        bey_a: &Bey,
        bey_b: &Bey,
        bey_c: &Bey,
        ctx: &mut TxContext,
    ): Deck {
        validate_deck(bey_a, bey_b, bey_c);

        let bey_ids = vector[
            bey::id(bey_a),
            bey::id(bey_b),
            bey::id(bey_c),
        ];

        Deck {
            id: object::new(ctx),
            bey_ids,
            owner: ctx.sender(),
        }
    }

    // ===== Getters =====

    public fun bey_ids(deck: &Deck): &vector<ID> { &deck.bey_ids }
    public fun owner(deck: &Deck): address { deck.owner }

    public fun contains_bey(deck: &Deck, bey_id: ID): bool {
        vector::contains(&deck.bey_ids, &bey_id)
    }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_for_testing(deck: Deck) {
        let Deck { id, .. } = deck;
        object::delete(id);
    }
}
