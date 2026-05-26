module spinforge::bit {
    use std::string::String;
    use sui::event;

    // ===== Error Codes =====
    const EInvalidCategory: u64 = 0;
    const EInvalidFriction: u64 = 1;
    const EInvalidMobility: u64 = 2;
    const EInvalidGearDiameter: u64 = 3;
    const EInvalidRarity: u64 = 4;

    // ===== Struct =====

    public struct Bit has key, store {
        id: UID,
        name: String,
        category: u8,              // 0=Attack, 1=Defense, 2=Stamina, 3=Gear
        friction: u16,             // 2-80 (x0.001 decay rate)
        mobility: u16,             // 1-5 zones accessible
        gear_diameter: u8,         // 0=none, 4, 6, 8, 10, 12
        has_life_after_death: bool,
        rarity: u8,
        xp: u32,
    }

    // ===== Events =====

    public struct BitMinted has copy, drop {
        bit_id: ID,
        name: String,
        category: u8,
        rarity: u8,
        owner: address,
    }

    // ===== Constructor =====

    public fun mint(
        name: String,
        category: u8,
        friction: u16,
        mobility: u16,
        gear_diameter: u8,
        has_life_after_death: bool,
        rarity: u8,
        ctx: &mut TxContext,
    ): Bit {
        assert!(category <= 3, EInvalidCategory);
        assert!(friction >= 2 && friction <= 80, EInvalidFriction);
        assert!(mobility >= 1 && mobility <= 5, EInvalidMobility);
        assert!(is_valid_gear_diameter(gear_diameter), EInvalidGearDiameter);
        assert!(rarity <= 3, EInvalidRarity);

        let bit = Bit {
            id: object::new(ctx),
            name,
            category,
            friction,
            mobility,
            gear_diameter,
            has_life_after_death,
            rarity,
            xp: 0,
        };

        event::emit(BitMinted {
            bit_id: object::id(&bit),
            name: bit.name,
            category,
            rarity,
            owner: ctx.sender(),
        });

        bit
    }

    // ===== Helpers =====

    fun is_valid_gear_diameter(d: u8): bool {
        d == 0 || d == 4 || d == 6 || d == 8 || d == 10 || d == 12
    }

    public fun add_xp(bit: &mut Bit, amount: u32) {
        bit.xp = bit.xp + amount;
    }

    // ===== Getters =====

    public fun id(bit: &Bit): ID { object::id(bit) }
    public fun name(bit: &Bit): String { bit.name }
    public fun category(bit: &Bit): u8 { bit.category }
    public fun friction(bit: &Bit): u16 { bit.friction }
    public fun mobility(bit: &Bit): u16 { bit.mobility }
    public fun gear_diameter(bit: &Bit): u8 { bit.gear_diameter }
    public fun has_life_after_death(bit: &Bit): bool { bit.has_life_after_death }
    public fun rarity(bit: &Bit): u8 { bit.rarity }
    public fun xp(bit: &Bit): u32 { bit.xp }

    /// Destroy a bit (used for burning in forge).
    public fun destroy(bit: Bit) {
        let Bit { id, .. } = bit;
        object::delete(id);
    }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_for_testing(bit: Bit) {
        destroy(bit);
    }

    #[test_only]
    public fun mint_for_testing(ctx: &mut TxContext): Bit {
        mint(
            std::string::utf8(b"Rush"),
            0, // Attack category
            50,
            3,
            0, // no gear
            false,
            0, // Common
            ctx,
        )
    }

    #[test_only]
    public fun mint_gear_for_testing(ctx: &mut TxContext): Bit {
        mint(
            std::string::utf8(b"Gear Flat"),
            3, // Gear category
            40,
            3,
            8, // medium gear
            false,
            1, // Rare
            ctx,
        )
    }
}
