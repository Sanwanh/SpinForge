module spinforge::pack {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::random::{Self, Random};
    use sui::event;
    use spinforge::blade::{Self, Blade};
    use spinforge::ratchet::{Self, Ratchet};
    use spinforge::bit::{Self, Bit};
    use spinforge::spark_token::SPARK_TOKEN;

    // ===== Error Codes =====
    const EInsufficientPayment: u64 = 0;

    // ===== Constants =====
    const PACK_COST: u64 = 100_000_000_000; // 100 SPARK (9 decimals)

    // ===== Events =====

    public struct PackOpened has copy, drop {
        owner: address,
        blade_count: u64,
        ratchet_count: u64,
        bit_count: u64,
    }

    // ===== Pack Opening =====

    /// Open a pack: costs 100 SPARK, generates 5 random parts.
    /// Distribution: 2 Blades, 2 Ratchets, 1 Bit (fixed for simplicity).
    /// Uses sui::random for on-chain randomness.
    entry fun open_pack(
        payment: Coin<SPARK_TOKEN>,
        treasury_cap: &mut TreasuryCap<SPARK_TOKEN>,
        r: &Random,
        ctx: &mut TxContext,
    ) {
        assert!(coin::value(&payment) >= PACK_COST, EInsufficientPayment);
        coin::burn(treasury_cap, payment);

        let mut gen = random::new_generator(r, ctx);

        let mut blades = vector::empty<Blade>();
        let mut ratchets = vector::empty<Ratchet>();
        let mut bits = vector::empty<Bit>();

        // Generate 2 Blades
        let mut i = 0u64;
        while (i < 2) {
            let spirit_beast = random::generate_u8_in_range(&mut gen, 0, 3); // No Koryu from packs
            let bey_type = random::generate_u8_in_range(&mut gen, 0, 3);
            let spin_dir = random::generate_u8_in_range(&mut gen, 0, 1);
            let attack = random::generate_u16_in_range(&mut gen, 10, 80);
            let recoil = random::generate_u16_in_range(&mut gen, 15, 70);
            let rarity = roll_rarity(&mut gen);

            let blade = blade::mint(
                std::string::utf8(b"Pack Blade"),
                spirit_beast,
                bey_type,
                spin_dir,
                attack,
                recoil,
                rarity,
                ctx,
            );
            vector::push_back(&mut blades, blade);
            i = i + 1;
        };

        // Generate 2 Ratchets
        i = 0;
        while (i < 2) {
            let prongs = random::generate_u8_in_range(&mut gen, 0, 9);
            let height_roll = random::generate_u8_in_range(&mut gen, 0, 5);
            let height = index_to_height(height_roll);
            let weight = random::generate_u16_in_range(&mut gen, 50, 200);
            let burst_res = random::generate_u16_in_range(&mut gen, 100, 500);
            let rarity = roll_rarity(&mut gen);

            let ratchet = ratchet::mint(prongs, height, weight, burst_res, rarity, ctx);
            vector::push_back(&mut ratchets, ratchet);
            i = i + 1;
        };

        // Generate 1 Bit
        let category = random::generate_u8_in_range(&mut gen, 0, 3);
        let friction = random::generate_u16_in_range(&mut gen, 2, 80);
        let mobility = random::generate_u16_in_range(&mut gen, 1, 5);
        let gear_diameter = if (category == 3) {
            // Gear type gets a gear
            let gear_roll = random::generate_u8_in_range(&mut gen, 0, 4);
            index_to_gear(gear_roll)
        } else { 0 };
        let has_lad = category == 1; // Defense bits have life after death
        let rarity = roll_rarity(&mut gen);

        let bit = bit::mint(
            std::string::utf8(b"Pack Bit"),
            category,
            friction,
            mobility,
            gear_diameter,
            has_lad,
            rarity,
            ctx,
        );
        vector::push_back(&mut bits, bit);

        event::emit(PackOpened {
            owner: ctx.sender(),
            blade_count: 2,
            ratchet_count: 2,
            bit_count: 1,
        });

        let sender = ctx.sender();
        while (!vector::is_empty(&blades)) {
            transfer::public_transfer(vector::pop_back(&mut blades), sender);
        };
        vector::destroy_empty(blades);
        while (!vector::is_empty(&ratchets)) {
            transfer::public_transfer(vector::pop_back(&mut ratchets), sender);
        };
        vector::destroy_empty(ratchets);
        while (!vector::is_empty(&bits)) {
            transfer::public_transfer(vector::pop_back(&mut bits), sender);
        };
        vector::destroy_empty(bits);
    }

    // ===== Rarity Roll =====

    /// Roll rarity: 70% Common, 22% Rare, 7% Epic, 1% Legendary
    fun roll_rarity(gen: &mut random::RandomGenerator): u8 {
        let roll = random::generate_u8_in_range(gen, 1, 100);
        if (roll <= 70) { 0 }        // Common
        else if (roll <= 92) { 1 }   // Rare
        else if (roll <= 99) { 2 }   // Epic
        else { 3 }                    // Legendary
    }

    fun index_to_height(idx: u8): u8 {
        if (idx == 0) { 50 }
        else if (idx == 1) { 55 }
        else if (idx == 2) { 60 }
        else if (idx == 3) { 70 }
        else if (idx == 4) { 80 }
        else { 85 }
    }

    fun index_to_gear(idx: u8): u8 {
        if (idx == 0) { 4 }
        else if (idx == 1) { 6 }
        else if (idx == 2) { 8 }
        else if (idx == 3) { 10 }
        else { 12 }
    }

    // ===== Getters =====

    public fun pack_cost(): u64 { PACK_COST }
}
