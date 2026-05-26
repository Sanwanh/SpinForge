module spinforge::stadium {
    use std::string::String;
    use sui::event;

    // ===== Error Codes =====
    const EInvalidRailPattern: u64 = 0;
    const EInvalidDepth: u64 = 1;
    const EInvalidOwnerFee: u64 = 2;
    const EInvalidRarity: u64 = 3;

    // ===== Constants =====
    const MAX_OWNER_FEE_BPS: u16 = 200; // 2%

    // Rail patterns
    const PATTERN_STANDARD_X: u8 = 0;
    const PATTERN_INFINITY: u8 = 1;
    const PATTERN_DRAGON_MAW: u8 = 2;
    const PATTERN_FORTRESS: u8 = 3;
    const PATTERN_SEASONAL: u8 = 4;

    // ===== Struct =====

    public struct Stadium has key, store {
        id: UID,
        name: String,
        rail_pattern: u8,
        rail_zones: vector<u8>,
        element_terrain: u8,
        depth: u8,
        rarity: u8,
        owner_fee_bps: u16,
    }

    // ===== Events =====

    public struct StadiumMinted has copy, drop {
        stadium_id: ID,
        name: String,
        rail_pattern: u8,
        owner: address,
    }

    // ===== Constructor =====

    public(package) fun mint(
        name: String,
        rail_pattern: u8,
        rail_zones: vector<u8>,
        element_terrain: u8,
        depth: u8,
        rarity: u8,
        owner_fee_bps: u16,
        ctx: &mut TxContext,
    ): Stadium {
        assert!(rail_pattern <= PATTERN_SEASONAL, EInvalidRailPattern);
        assert!(depth > 0, EInvalidDepth);
        assert!(owner_fee_bps <= MAX_OWNER_FEE_BPS, EInvalidOwnerFee);
        assert!(rarity <= 3, EInvalidRarity);

        let stadium = Stadium {
            id: object::new(ctx),
            name,
            rail_pattern,
            rail_zones,
            element_terrain,
            depth,
            rarity,
            owner_fee_bps,
        };

        event::emit(StadiumMinted {
            stadium_id: object::id(&stadium),
            name: stadium.name,
            rail_pattern,
            owner: ctx.sender(),
        });

        stadium
    }

    // ===== Getters =====

    public fun id(stadium: &Stadium): ID { object::id(stadium) }
    public fun name(stadium: &Stadium): String { stadium.name }
    public fun rail_pattern(stadium: &Stadium): u8 { stadium.rail_pattern }
    public fun rail_zones(stadium: &Stadium): &vector<u8> { &stadium.rail_zones }
    public fun element_terrain(stadium: &Stadium): u8 { stadium.element_terrain }
    public fun depth(stadium: &Stadium): u8 { stadium.depth }
    public fun rarity(stadium: &Stadium): u8 { stadium.rarity }
    public fun owner_fee_bps(stadium: &Stadium): u16 { stadium.owner_fee_bps }

    /// Check if a zone is a rail zone in this stadium.
    public fun has_rail_at_zone(stadium: &Stadium, zone: u8): bool {
        vector::contains(&stadium.rail_zones, &zone)
    }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_for_testing(stadium: Stadium) {
        let Stadium { id, .. } = stadium;
        object::delete(id);
    }

    #[test_only]
    public fun mint_for_testing(ctx: &mut TxContext): Stadium {
        let rail_zones = vector[3u8]; // Rail zone at position 3
        mint(
            std::string::utf8(b"Standard X"),
            PATTERN_STANDARD_X,
            rail_zones,
            0, // Wood terrain
            10,
            0, // Common
            100, // 1%
            ctx,
        )
    }
}
