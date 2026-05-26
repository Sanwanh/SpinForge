module spinforge::blade {
    use std::string::String;
    use sui::event;

    // ===== Error Codes =====
    const EInvalidSpiritBeast: u64 = 0;
    const EInvalidBeyType: u64 = 2;
    const EInvalidSpinDirection: u64 = 3;
    const EInvalidAttack: u64 = 4;
    const EInvalidRecoilFactor: u64 = 5;
    const EInvalidRarity: u64 = 6;

    // ===== Constants =====
    const KORYU: u8 = 4;
    const TYPE_BAL: u8 = 3;
    const SPIN_LEFT: u8 = 1;
    const RARITY_LEGENDARY: u8 = 3;

    // ===== Struct =====

    public struct Blade has key, store {
        id: UID,
        name: String,
        spirit_beast: u8,
        element: u8,
        bey_type: u8,
        spin_direction: u8,
        attack: u16,
        recoil_factor: u16,
        rarity: u8,
        xp: u32,
    }

    // ===== Events =====

    public struct BladeMinted has copy, drop {
        blade_id: ID,
        name: String,
        spirit_beast: u8,
        rarity: u8,
        owner: address,
    }

    // ===== Constructor =====

    public(package) fun mint(
        name: String,
        spirit_beast: u8,
        bey_type: u8,
        spin_direction: u8,
        attack: u16,
        recoil_factor: u16,
        rarity: u8,
        ctx: &mut TxContext,
    ): Blade {
        assert!(spirit_beast <= KORYU, EInvalidSpiritBeast);
        assert!(bey_type <= TYPE_BAL, EInvalidBeyType);
        assert!(spin_direction <= SPIN_LEFT, EInvalidSpinDirection);
        assert!(attack >= 10 && attack <= 100, EInvalidAttack);
        assert!(recoil_factor >= 10 && recoil_factor <= 80, EInvalidRecoilFactor);
        assert!(rarity <= RARITY_LEGENDARY, EInvalidRarity);

        let element = spirit_beast_to_element(spirit_beast);

        let blade = Blade {
            id: object::new(ctx),
            name,
            spirit_beast,
            element,
            bey_type,
            spin_direction,
            attack,
            recoil_factor,
            rarity,
            xp: 0,
        };

        event::emit(BladeMinted {
            blade_id: object::id(&blade),
            name: blade.name,
            spirit_beast,
            rarity,
            owner: ctx.sender(),
        });

        blade
    }

    // ===== Helpers =====

    public fun spirit_beast_to_element(beast: u8): u8 {
        if (beast == 0) { 0 }
        else if (beast == 1) { 1 }
        else if (beast == 2) { 2 }
        else if (beast == 3) { 3 }
        else { 4 }
    }

    public(package) fun add_xp(blade: &mut Blade, amount: u32) {
        blade.xp = blade.xp + amount;
    }

    public(package) fun set_attack(blade: &mut Blade, new_attack: u16) {
        blade.attack = new_attack;
    }

    // ===== Getters =====

    public fun id(blade: &Blade): ID { object::id(blade) }
    public fun name(blade: &Blade): String { blade.name }
    public fun spirit_beast(blade: &Blade): u8 { blade.spirit_beast }
    public fun element(blade: &Blade): u8 { blade.element }
    public fun bey_type(blade: &Blade): u8 { blade.bey_type }
    public fun spin_direction(blade: &Blade): u8 { blade.spin_direction }
    public fun attack(blade: &Blade): u16 { blade.attack }
    public fun recoil_factor(blade: &Blade): u16 { blade.recoil_factor }
    public fun rarity(blade: &Blade): u8 { blade.rarity }
    public fun xp(blade: &Blade): u32 { blade.xp }

    /// Destroy a blade (used for burning in forge).
    public fun destroy(blade: Blade) {
        let Blade { id, .. } = blade;
        object::delete(id);
    }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_for_testing(blade: Blade) {
        destroy(blade);
    }

    #[test_only]
    public fun mint_for_testing(ctx: &mut TxContext): Blade {
        mint(
            std::string::utf8(b"Test Blade"),
            0, // Seiryu
            0, // ATK
            0, // Right
            50,
            30,
            0, // Common
            ctx,
        )
    }
}
