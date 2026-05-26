module spinforge::forge_token {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::event;

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
        let coin = coin::mint(treasury_cap, amount, ctx);
        event::emit(ForgeMinted { amount, recipient });
        transfer::public_transfer(coin, recipient);
    }

    public fun mint_coin(
        treasury_cap: &mut TreasuryCap<FORGE_TOKEN>,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<FORGE_TOKEN> {
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
