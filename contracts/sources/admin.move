module spinforge::admin {
    use sui::event;

    // ===== Error Codes =====
    const ENotAdmin: u64 = 0;
    const EAlreadyBanned: u64 = 1;
    const ENotBanned: u64 = 2;
    const EInvalidConstant: u64 = 3;

    // ===== Structs =====

    /// One-time admin capability, created at publish time.
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Global config: tunable physics constants and ban-list.
    public struct GameConfig has key {
        id: UID,
        /// Base spin decay per turn (basis points, e.g. 500 = 5%)
        base_decay_bps: u16,
        /// Xtreme dash damage multiplier (percent, e.g. 150 = 1.5x)
        xtreme_dash_multiplier: u16,
        /// Spin steal rate (percent of damage, e.g. 10 = 10%)
        spin_steal_rate: u16,
        /// Max lock tightness value
        max_lock_tightness: u8,
        /// Match win target score
        match_win_score: u8,
        /// Ban list
        banned_players: vector<address>,
    }

    // ===== Events =====

    public struct AdminCapCreated has copy, drop { admin: address }
    public struct PlayerBanned has copy, drop { player: address }
    public struct PlayerUnbanned has copy, drop { player: address }
    public struct ConfigUpdated has copy, drop { field: vector<u8>, value: u64 }

    // ===== Init =====

    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };
        event::emit(AdminCapCreated { admin: ctx.sender() });
        transfer::transfer(admin_cap, ctx.sender());

        let config = GameConfig {
            id: object::new(ctx),
            base_decay_bps: 500,
            xtreme_dash_multiplier: 150,
            spin_steal_rate: 10,
            max_lock_tightness: 5,
            match_win_score: 7,
            banned_players: vector::empty(),
        };
        transfer::share_object(config);
    }

    // ===== Admin Functions =====

    public fun ban_player(
        _cap: &AdminCap,
        config: &mut GameConfig,
        player: address,
    ) {
        assert!(!vector::contains(&config.banned_players, &player), EAlreadyBanned);
        vector::push_back(&mut config.banned_players, player);
        event::emit(PlayerBanned { player });
    }

    public fun unban_player(
        _cap: &AdminCap,
        config: &mut GameConfig,
        player: address,
    ) {
        let (found, idx) = vector::index_of(&config.banned_players, &player);
        assert!(found, ENotBanned);
        vector::remove(&mut config.banned_players, idx);
        event::emit(PlayerUnbanned { player });
    }

    public fun set_base_decay_bps(
        _cap: &AdminCap,
        config: &mut GameConfig,
        value: u16,
    ) {
        assert!(value > 0 && value <= 5000, EInvalidConstant);
        config.base_decay_bps = value;
        event::emit(ConfigUpdated { field: b"base_decay_bps", value: (value as u64) });
    }

    public fun set_xtreme_dash_multiplier(
        _cap: &AdminCap,
        config: &mut GameConfig,
        value: u16,
    ) {
        assert!(value >= 100 && value <= 500, EInvalidConstant);
        config.xtreme_dash_multiplier = value;
        event::emit(ConfigUpdated { field: b"xtreme_dash_multiplier", value: (value as u64) });
    }

    public fun set_spin_steal_rate(
        _cap: &AdminCap,
        config: &mut GameConfig,
        value: u16,
    ) {
        assert!(value <= 50, EInvalidConstant);
        config.spin_steal_rate = value;
        event::emit(ConfigUpdated { field: b"spin_steal_rate", value: (value as u64) });
    }

    public fun set_match_win_score(
        _cap: &AdminCap,
        config: &mut GameConfig,
        value: u8,
    ) {
        assert!(value >= 3 && value <= 15, EInvalidConstant);
        config.match_win_score = value;
        event::emit(ConfigUpdated { field: b"match_win_score", value: (value as u64) });
    }

    // ===== Getters =====

    public fun is_banned(config: &GameConfig, player: address): bool {
        vector::contains(&config.banned_players, &player)
    }

    public fun base_decay_bps(config: &GameConfig): u16 { config.base_decay_bps }
    public fun xtreme_dash_multiplier(config: &GameConfig): u16 { config.xtreme_dash_multiplier }
    public fun spin_steal_rate(config: &GameConfig): u16 { config.spin_steal_rate }
    public fun max_lock_tightness(config: &GameConfig): u8 { config.max_lock_tightness }
    public fun match_win_score(config: &GameConfig): u8 { config.match_win_score }

    // ===== Test Helpers =====

    #[test_only]
    public fun create_admin_cap_for_testing(ctx: &mut TxContext): AdminCap {
        AdminCap { id: object::new(ctx) }
    }

    #[test_only]
    public fun create_game_config_for_testing(ctx: &mut TxContext): GameConfig {
        GameConfig {
            id: object::new(ctx),
            base_decay_bps: 500,
            xtreme_dash_multiplier: 150,
            spin_steal_rate: 10,
            max_lock_tightness: 5,
            match_win_score: 7,
            banned_players: vector::empty(),
        }
    }

    #[test_only]
    public fun destroy_admin_cap(cap: AdminCap) {
        let AdminCap { id } = cap;
        object::delete(id);
    }

    #[test_only]
    public fun destroy_game_config(config: GameConfig) {
        let GameConfig { id, .. } = config;
        object::delete(id);
    }
}
