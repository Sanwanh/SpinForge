module spinforge::spirit {
    use sui::event;

    // ===== Error Codes =====
    const EInvalidBeast: u64 = 0;
    const EInvalidTier: u64 = 1;
    const EInvalidAbility: u64 = 2;
    const EAlreadyActivated: u64 = 3;

    // ===== Constants =====
    // Beasts: 0=Seiryu, 1=Suzaku, 2=Byakko, 3=Genbu, 4=Koryu

    // Tiers: 0=Common, 1=Rare, 2=Epic, 3=Legendary
    // Abilities per beast:
    //   Seiryu(0): Dragon's Fury = 0
    //   Suzaku(1): Phoenix Rebirth = 1
    //   Byakko(2): Tiger's Claw = 2
    //   Genbu(3): Tortoise Shell = 3
    //   Koryu(4): Emperor's Decree = 4

    // ===== Struct =====

    /// Soulbound Spirit Avatar: key only (NO store), cannot be transferred.
    public struct SpiritAvatar has key {
        id: UID,
        beast: u8,
        tier: u8,
        ultimate_ability: u8,
        activated_count: u32,
    }

    // ===== Events =====

    public struct SpiritAvatarMinted has copy, drop {
        avatar_id: ID,
        beast: u8,
        tier: u8,
        owner: address,
    }

    public struct SpiritActivated has copy, drop {
        avatar_id: ID,
        ability: u8,
    }

    // ===== Constructor =====

    /// Mint a soulbound spirit avatar. Uses `transfer::transfer` (not public_transfer)
    /// because SpiritAvatar lacks `store`.
    public fun mint(
        beast: u8,
        tier: u8,
        recipient: address,
        ctx: &mut TxContext,
    ): ID {
        assert!(beast <= 4, EInvalidBeast);
        assert!(tier <= 3, EInvalidTier);
        // Koryu (4) requires Legendary tier (3)
        if (beast == 4) {
            assert!(tier == 3, EInvalidBeast);
        };

        let ultimate_ability = beast; // 1:1 mapping for now

        let avatar = SpiritAvatar {
            id: object::new(ctx),
            beast,
            tier,
            ultimate_ability,
            activated_count: 0,
        };

        let avatar_id = object::id(&avatar);

        event::emit(SpiritAvatarMinted {
            avatar_id,
            beast,
            tier,
            owner: recipient,
        });

        transfer::transfer(avatar, recipient);
        avatar_id
    }

    // ===== Activation =====

    /// Activate the spirit's ultimate ability. Increments counter.
    public fun activate(avatar: &mut SpiritAvatar) {
        avatar.activated_count = avatar.activated_count + 1;
        event::emit(SpiritActivated {
            avatar_id: object::id(avatar),
            ability: avatar.ultimate_ability,
        });
    }

    // ===== Getters =====

    public fun beast(avatar: &SpiritAvatar): u8 { avatar.beast }
    public fun tier(avatar: &SpiritAvatar): u8 { avatar.tier }
    public fun ultimate_ability(avatar: &SpiritAvatar): u8 { avatar.ultimate_ability }
    public fun activated_count(avatar: &SpiritAvatar): u32 { avatar.activated_count }

    // ===== Test Helpers =====

    #[test_only]
    public fun destroy_for_testing(avatar: SpiritAvatar) {
        let SpiritAvatar { id, .. } = avatar;
        object::delete(id);
    }
}
