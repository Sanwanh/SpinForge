module spinforge::marketplace {
    use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
    use sui::transfer_policy::{Self, TransferPolicy, TransferPolicyCap};
    use sui::package;
    use sui::event;
    use spinforge::blade::Blade;

    // ===== Error Codes =====
    const EInvalidPrice: u64 = 0;

    // ===== OTW =====
    public struct MARKETPLACE has drop {}

    // ===== Events =====

    public struct MarketplaceInitialized has copy, drop {
        policy_id: ID,
    }

    public struct ItemListed has copy, drop {
        kiosk_id: ID,
        item_id: ID,
        price: u64,
        seller: address,
    }

    // ===== Init =====

    fun init(otw: MARKETPLACE, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);

        // Create TransferPolicy for Blade (example; real deployment would do all types)
        let (policy, policy_cap) = transfer_policy::new<Blade>(&publisher, ctx);

        event::emit(MarketplaceInitialized {
            policy_id: object::id(&policy),
        });

        transfer::public_share_object(policy);
        transfer::public_transfer(policy_cap, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());
    }

    // ===== Kiosk Operations =====

    /// Create a new kiosk for a seller.
    public fun create_kiosk(ctx: &mut TxContext): (Kiosk, KioskOwnerCap) {
        kiosk::new(ctx)
    }

    /// List a Blade in the kiosk.
    public fun list_blade(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        blade: Blade,
        price: u64,
    ) {
        assert!(price > 0, EInvalidPrice);
        let blade_id = object::id(&blade);
        kiosk::place(kiosk, cap, blade);
        kiosk::list<Blade>(kiosk, cap, blade_id, price);

        event::emit(ItemListed {
            kiosk_id: object::id(kiosk),
            item_id: blade_id,
            price,
            seller: kiosk::owner(kiosk),
        });
    }

    /// Delist a Blade from the kiosk.
    public fun delist_blade(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        blade_id: ID,
    ): Blade {
        kiosk::delist<Blade>(kiosk, cap, blade_id);
        kiosk::take<Blade>(kiosk, cap, blade_id)
    }
}
