module spinforge::forge {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::event;
    use spinforge::blade::{Self, Blade};
    use spinforge::ratchet::{Self, Ratchet};
    use spinforge::bit::{Self, Bit};
    use spinforge::spark_token::SPARK_TOKEN;

    // ===== Error Codes =====
    const EInsufficientSpark: u64 = 0;
    const EInvalidRarityForEvolution: u64 = 1;
    const EInvalidRarityForFusion: u64 = 2;
    const EInvalidPartType: u64 = 4;

    // ===== Constants =====
    const EVOLUTION_COST: u64 = 50_000_000_000;  // 50 SPARK (9 decimals)
    const FUSION_COST: u64 = 200_000_000_000;    // 200 SPARK
    const RETUNE_COST: u64 = 75_000_000_000;     // 75 SPARK

    const RARITY_COMMON: u8 = 0;
    const RARITY_RARE: u8 = 1;
    const RARITY_EPIC: u8 = 2;

    // ===== Events =====

    public struct BladeEvolved has copy, drop {
        new_blade_id: ID,
        rarity: u8,
        owner: address,
    }

    public struct RatchetEvolved has copy, drop {
        new_ratchet_id: ID,
        rarity: u8,
        owner: address,
    }

    public struct BitEvolved has copy, drop {
        new_bit_id: ID,
        rarity: u8,
        owner: address,
    }

    public struct BladeFused has copy, drop {
        new_blade_id: ID,
        rarity: u8,
        owner: address,
    }

    public struct BladeRetuned has copy, drop {
        blade_id: ID,
        new_attack: u16,
        owner: address,
    }

    // ===== Evolution: 3 Common -> 1 Rare, costs 50 SPARK =====

    /// Evolve 3 Common Blades into 1 Rare Blade. Burns the 3 inputs.
    public fun evolve_blades(
        blade_a: Blade,
        blade_b: Blade,
        blade_c: Blade,
        payment: Coin<SPARK_TOKEN>,
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        ctx: &mut TxContext,
    ): Blade {
        assert!(coin::value(&payment) >= EVOLUTION_COST, EInsufficientSpark);
        assert!(blade::rarity(&blade_a) == RARITY_COMMON, EInvalidRarityForEvolution);
        assert!(blade::rarity(&blade_b) == RARITY_COMMON, EInvalidRarityForEvolution);
        assert!(blade::rarity(&blade_c) == RARITY_COMMON, EInvalidRarityForEvolution);

        let base_attack = blade::attack(&blade_a);
        let new_attack = if (base_attack + 15 > 100) { 100 } else { base_attack + 15 };
        let new_recoil = blade::recoil_factor(&blade_a);

        blade::destroy(blade_a);
        blade::destroy(blade_b);
        blade::destroy(blade_c);

        coin::burn(treasury_cap, payment);

        let new_blade = blade::mint(
            std::string::utf8(b"Evolved Blade"),
            0, 0, 0,
            new_attack,
            new_recoil,
            RARITY_RARE,
            ctx,
        );

        event::emit(BladeEvolved {
            new_blade_id: blade::id(&new_blade),
            rarity: RARITY_RARE,
            owner: ctx.sender(),
        });

        new_blade
    }

    /// Evolve 3 Common Ratchets into 1 Rare Ratchet.
    public fun evolve_ratchets(
        ratchet_a: Ratchet,
        ratchet_b: Ratchet,
        ratchet_c: Ratchet,
        payment: Coin<SPARK_TOKEN>,
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        ctx: &mut TxContext,
    ): Ratchet {
        assert!(coin::value(&payment) >= EVOLUTION_COST, EInsufficientSpark);
        assert!(ratchet::rarity(&ratchet_a) == RARITY_COMMON, EInvalidRarityForEvolution);
        assert!(ratchet::rarity(&ratchet_b) == RARITY_COMMON, EInvalidRarityForEvolution);
        assert!(ratchet::rarity(&ratchet_c) == RARITY_COMMON, EInvalidRarityForEvolution);

        let base_weight = ratchet::weight(&ratchet_a);
        let new_weight = base_weight + 20;
        let base_burst = ratchet::burst_resistance(&ratchet_a);
        let base_prongs = ratchet::prongs(&ratchet_a);
        let base_height = ratchet::height(&ratchet_a);

        ratchet::destroy(ratchet_a);
        ratchet::destroy(ratchet_b);
        ratchet::destroy(ratchet_c);
        coin::burn(treasury_cap, payment);

        let new_ratchet = ratchet::mint(
            base_prongs, base_height, new_weight,
            base_burst,
            RARITY_RARE,
            ctx,
        );

        event::emit(RatchetEvolved {
            new_ratchet_id: ratchet::id(&new_ratchet),
            rarity: RARITY_RARE,
            owner: ctx.sender(),
        });

        new_ratchet
    }

    /// Evolve 3 Common Bits into 1 Rare Bit.
    public fun evolve_bits(
        bit_a: Bit,
        bit_b: Bit,
        bit_c: Bit,
        payment: Coin<SPARK_TOKEN>,
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        ctx: &mut TxContext,
    ): Bit {
        assert!(coin::value(&payment) >= EVOLUTION_COST, EInsufficientSpark);
        assert!(bit::rarity(&bit_a) == RARITY_COMMON, EInvalidRarityForEvolution);
        assert!(bit::rarity(&bit_b) == RARITY_COMMON, EInvalidRarityForEvolution);
        assert!(bit::rarity(&bit_c) == RARITY_COMMON, EInvalidRarityForEvolution);

        let base_friction = bit::friction(&bit_a);
        let new_friction = if (base_friction > 5) { base_friction - 5 } else { 2 };
        let base_category = bit::category(&bit_a);
        let base_mobility = bit::mobility(&bit_a);
        let base_gear = bit::gear_diameter(&bit_a);
        let base_lad = bit::has_life_after_death(&bit_a);

        bit::destroy(bit_a);
        bit::destroy(bit_b);
        bit::destroy(bit_c);
        coin::burn(treasury_cap, payment);

        let new_bit = bit::mint(
            std::string::utf8(b"Evolved Bit"),
            base_category,
            new_friction,
            base_mobility,
            base_gear,
            base_lad,
            RARITY_RARE,
            ctx,
        );

        event::emit(BitEvolved {
            new_bit_id: bit::id(&new_bit),
            rarity: RARITY_RARE,
            owner: ctx.sender(),
        });

        new_bit
    }

    // ===== Fusion: 2 Rare -> 1 Epic, costs 200 SPARK =====

    /// Fuse 2 Rare Blades into 1 Epic Blade.
    public fun fuse_blades(
        blade_a: Blade,
        blade_b: Blade,
        payment: Coin<SPARK_TOKEN>,
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        ctx: &mut TxContext,
    ): Blade {
        assert!(coin::value(&payment) >= FUSION_COST, EInsufficientSpark);
        assert!(blade::rarity(&blade_a) == RARITY_RARE, EInvalidRarityForFusion);
        assert!(blade::rarity(&blade_b) == RARITY_RARE, EInvalidRarityForFusion);

        let atk_a = blade::attack(&blade_a);
        let atk_b = blade::attack(&blade_b);
        let best_atk = if (atk_a > atk_b) { atk_a } else { atk_b };
        let new_attack = if (best_atk + 10 > 100) { 100 } else { best_atk + 10 };

        let recoil_a = blade::recoil_factor(&blade_a);
        let recoil_b = blade::recoil_factor(&blade_b);
        let best_recoil = if (recoil_a < recoil_b) { recoil_a } else { recoil_b };

        let base_spirit = blade::spirit_beast(&blade_a);
        let base_type = blade::bey_type(&blade_a);
        let base_spin = blade::spin_direction(&blade_a);

        blade::destroy(blade_a);
        blade::destroy(blade_b);
        coin::burn(treasury_cap, payment);

        let new_blade = blade::mint(
            std::string::utf8(b"Fused Blade"),
            base_spirit, base_type, base_spin,
            new_attack,
            best_recoil,
            RARITY_EPIC,
            ctx,
        );

        event::emit(BladeFused {
            new_blade_id: blade::id(&new_blade),
            rarity: RARITY_EPIC,
            owner: ctx.sender(),
        });

        new_blade
    }

    // ===== Re-tune: Reroll 1 stat, costs 75 SPARK =====

    /// Re-tune a blade's attack stat with a new random value.
    public fun retune_blade_attack(
        blade: &mut Blade,
        new_attack: u16,
        payment: Coin<SPARK_TOKEN>,
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        ctx: &mut TxContext,
    ) {
        assert!(coin::value(&payment) >= RETUNE_COST, EInsufficientSpark);
        assert!(new_attack >= 10 && new_attack <= 100, EInvalidPartType);

        coin::burn(treasury_cap, payment);
        blade::set_attack(blade, new_attack);

        event::emit(BladeRetuned {
            blade_id: blade::id(blade),
            new_attack,
            owner: ctx.sender(),
        });
    }

    // ===== Getters =====

    public fun evolution_cost(): u64 { EVOLUTION_COST }
    public fun fusion_cost(): u64 { FUSION_COST }
    public fun retune_cost(): u64 { RETUNE_COST }
}
