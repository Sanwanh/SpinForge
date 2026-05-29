module spinforge::ratchet {
    use sui::event;

    // ===== Error Codes =====
    const EInvalidProngs: u64 = 0;
    const EInvalidHeight: u64 = 1;
    const EInvalidWeight: u64 = 2;
    const EInvalidBurstResistance: u64 = 3;
    const EInvalidRarity: u64 = 4;

    // ===== Struct =====

    public struct Ratchet has key, store {
        id: UID,
        prongs: u8,            // 0-9
        height: u8,            // 50, 55, 60, 70, 80, 85
        weight: u16,           // moment of inertia factor
        burst_resistance: u16, // base burst integrity
        rarity: u8,
        xp: u32,
    }

    // ===== Events =====

    public struct RatchetMinted has copy, drop {
        ratchet_id: ID,
        prongs: u8,
        height: u8,
        rarity: u8,
        owner: address,
    }

    // ===== Constructor =====

    public(package) fun mint(
        prongs: u8,
        height: u8,
        weight: u16,
        burst_resistance: u16,
        rarity: u8,
        ctx: &mut TxContext,
    ): Ratchet {
        assert!(prongs <= 9, EInvalidProngs);
        assert!(is_valid_height(height), EInvalidHeight);
        assert!(weight > 0, EInvalidWeight);
        assert!(burst_resistance > 0, EInvalidBurstResistance);
        assert!(rarity <= 3, EInvalidRarity);

        let ratchet = Ratchet {
            id: object::new(ctx),
            prongs,
            height,
            weight,
            burst_resistance,
            rarity,
            xp: 0,
        };

        event::emit(RatchetMinted {
            ratchet_id: object::id(&ratchet),
            prongs,
            height,
            rarity,
            owner: ctx.sender(),
        });

        ratchet
    }

    // ===== Helpers =====

    fun is_valid_height(h: u8): bool {
        h == 50 || h == 55 || h == 60 || h == 70 || h == 80 || h == 85
    }

    // `public(package)` to match blade::add_xp — owners cannot self-grant XP. (H-3)
    public(package) fun add_xp(ratchet: &mut Ratchet, amount: u32) {
        ratchet.xp = ratchet.xp + amount;
    }

    /// Display name like "3-60"
    public fun display_name(ratchet: &Ratchet): vector<u8> {
        let mut result = vector::empty<u8>();
        vector::push_back(&mut result, 48 + ratchet.prongs); // ASCII digit
        vector::push_back(&mut result, 45); // '-'
        // height as two digits
        vector::push_back(&mut result, 48 + (ratchet.height / 10));
        vector::push_back(&mut result, 48 + (ratchet.height % 10));
        result
    }

    // ===== Getters =====

    public fun id(ratchet: &Ratchet): ID { object::id(ratchet) }
    public fun prongs(ratchet: &Ratchet): u8 { ratchet.prongs }
    public fun height(ratchet: &Ratchet): u8 { ratchet.height }
    public fun weight(ratchet: &Ratchet): u16 { ratchet.weight }
    public fun burst_resistance(ratchet: &Ratchet): u16 { ratchet.burst_resistance }
    public fun rarity(ratchet: &Ratchet): u8 { ratchet.rarity }
    public fun xp(ratchet: &Ratchet): u32 { ratchet.xp }

    /// Destroy a ratchet (used for burning in forge).
    public fun destroy(ratchet: Ratchet) {
        let Ratchet { id, .. } = ratchet;
        object::delete(id);
    }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_for_testing(ratchet: Ratchet) {
        destroy(ratchet);
    }

    #[test_only]
    public fun mint_for_testing(ctx: &mut TxContext): Ratchet {
        mint(3, 60, 100, 200, 0, ctx)
    }
}
