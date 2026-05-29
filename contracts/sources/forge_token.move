module spinforge::forge_token {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::event;

    // ===== Error Codes =====
    /// A single mint call exceeded the per-call ceiling. (H-2)
    const EMintAmountTooLarge: u64 = 0;

    // ===== Constants =====
    /// Hard ceiling on a single mint call (100,000 FORGE at 9 decimals).
    const MAX_MINT_PER_CALL: u64 = 100_000_000_000_000;

    // ===== OTW =====

    /// One-Time Witness for Coin<FORGE_TOKEN>
    public struct FORGE_TOKEN has drop {}

    // ===== Events =====

    public struct ForgeMinted has copy, drop {
        amount: u64,
        recipient: address,
    }

    // ===== Init =====

    fun init(witness: FORGE_TOKEN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9, // decimals
            b"FORGE",
            b"Forge Token",
            b"SpinForge governance token for tournaments and voting",
            option::none(),
            ctx,
        );

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, ctx.sender());
    }

    // ===== Mint =====

    public fun mint(
        treasury_cap: &mut TreasuryCap<FORGE_TOKEN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        assert!(amount <= MAX_MINT_PER_CALL, EMintAmountTooLarge);
        let coin = coin::mint(treasury_cap, amount, ctx);
        event::emit(ForgeMinted { amount, recipient });
        transfer::public_transfer(coin, recipient);
    }

    public fun mint_coin(
        treasury_cap: &mut TreasuryCap<FORGE_TOKEN>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<FORGE_TOKEN> {
        assert!(amount <= MAX_MINT_PER_CALL, EMintAmountTooLarge);
        coin::mint(treasury_cap, amount, ctx)
    }

    // ===== Burn =====

    public fun burn(
        treasury_cap: &mut TreasuryCap<FORGE_TOKEN>,
        coin: Coin<FORGE_TOKEN>,
    ) {
        coin::burn(treasury_cap, coin);
    }

    // ===== Test Helpers =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(FORGE_TOKEN {}, ctx);
    }
}
