module spinforge::player_profile {
    use std::string::String;
    use sui::event;

    const EProfileExists: u64 = 0;

    public struct PlayerProfile has key, store {
        id: UID,
        owner: address,
        display_name: String,
        wins: u32,
        losses: u32,
        elo: u32,
        total_battles: u32,
        xtreme_finishes: u32,
        burst_finishes: u32,
        created_at: u64,
    }

    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        display_name: String,
    }

    public struct ProfileUpdated has copy, drop {
        profile_id: ID,
        wins: u32,
        losses: u32,
        elo: u32,
    }

    public fun create(
        display_name: String,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext,
    ): PlayerProfile {
        let profile = PlayerProfile {
            id: object::new(ctx),
            owner: ctx.sender(),
            display_name,
            wins: 0,
            losses: 0,
            elo: 1000,
            total_battles: 0,
            xtreme_finishes: 0,
            burst_finishes: 0,
            created_at: sui::clock::timestamp_ms(clock),
        };

        event::emit(ProfileCreated {
            profile_id: object::id(&profile),
            owner: ctx.sender(),
            display_name: profile.display_name,
        });

        profile
    }

    public fun record_battle_result(
        profile: &mut PlayerProfile,
        won: bool,
        is_xtreme: bool,
        is_burst: bool,
    ) {
        profile.total_battles = profile.total_battles + 1;
        if (won) {
            profile.wins = profile.wins + 1;
            profile.elo = profile.elo + 25;
            if (is_xtreme) { profile.xtreme_finishes = profile.xtreme_finishes + 1; };
            if (is_burst) { profile.burst_finishes = profile.burst_finishes + 1; };
        } else {
            profile.losses = profile.losses + 1;
            if (profile.elo > 25) {
                profile.elo = profile.elo - 25;
            } else {
                profile.elo = 0;
            };
        };

        event::emit(ProfileUpdated {
            profile_id: object::id(profile),
            wins: profile.wins,
            losses: profile.losses,
            elo: profile.elo,
        });
    }

    public fun owner(profile: &PlayerProfile): address { profile.owner }
    public fun display_name(profile: &PlayerProfile): String { profile.display_name }
    public fun wins(profile: &PlayerProfile): u32 { profile.wins }
    public fun losses(profile: &PlayerProfile): u32 { profile.losses }
    public fun elo(profile: &PlayerProfile): u32 { profile.elo }
    public fun total_battles(profile: &PlayerProfile): u32 { profile.total_battles }
    public fun xtreme_finishes(profile: &PlayerProfile): u32 { profile.xtreme_finishes }
    public fun burst_finishes(profile: &PlayerProfile): u32 { profile.burst_finishes }

    #[test_only]
    public fun destroy_for_testing(profile: PlayerProfile) {
        let PlayerProfile { id, .. } = profile;
        object::delete(id);
    }
}
