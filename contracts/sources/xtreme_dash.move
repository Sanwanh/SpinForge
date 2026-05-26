module spinforge::xtreme_dash {
    use spinforge::bit::{Self, Bit};
    use spinforge::stadium::{Self, Stadium};

    // ===== Error Codes =====
    const ECannotDash: u64 = 0;
    const ENoGear: u64 = 1;

    // ===== Constants =====
    const ACCURACY_SMALL: u8 = 70;   // gear <= 6
    const ACCURACY_MEDIUM: u8 = 85;  // gear <= 10
    const ACCURACY_LARGE: u8 = 95;   // gear 12

    const DASH_MULTIPLIER: u64 = 150; // 1.5x damage

    // ===== Functions =====

    /// Check if a bey can perform an Xtreme Dash.
    /// Requires: gear bit + being on a rail zone of the stadium.
    public fun can_dash(bit: &Bit, zone: u8, stadium: &Stadium): bool {
        bit::gear_diameter(bit) > 0 && stadium::has_rail_at_zone(stadium, zone)
    }

    /// Get accuracy threshold based on gear diameter.
    public fun accuracy_threshold(gear_diameter: u8): u8 {
        if (gear_diameter <= 6) { ACCURACY_SMALL }
        else if (gear_diameter <= 10) { ACCURACY_MEDIUM }
        else { ACCURACY_LARGE }
    }

    /// Compute dash damage and hit result.
    /// roll: random 1-100 (provided by caller from sui::random)
    /// Returns (damage, did_hit)
    public fun compute_dash(
        bit: &Bit,
        atk_am: u64,
        roll: u8,
    ): (u64, bool) {
        let gear = bit::gear_diameter(bit);
        assert!(gear > 0, ENoGear);

        let threshold = accuracy_threshold(gear);
        let hit = roll <= threshold;

        let damage = if (hit) {
            atk_am * DASH_MULTIPLIER / 100
        } else {
            // Glancing blow on miss: 50% of base
            atk_am * 50 / 100
        };

        (damage, hit)
    }

    /// Compute self-recoil from Xtreme Dash (2x normal recoil).
    public fun compute_dash_recoil(damage: u64, recoil_factor: u16): u64 {
        damage * (recoil_factor as u64) * 2 / 100
    }

    /// Check if the dash result qualifies as an Xtreme Finish (3 pts).
    /// Must hit AND reduce opponent AM to 0.
    public fun is_xtreme_finish(hit: bool, defender_am_after: u64): bool {
        hit && defender_am_after == 0
    }
}
