module spinforge::physics {
    use spinforge::blade::{Self, Blade};
    use spinforge::ratchet::{Self, Ratchet};
    use spinforge::bit::{Self, Bit};

    // ===== Constants =====

    // Bey types: 0=ATK, 1=DEF, 2=STA, 3=BAL
    // Elements: 0=Wood, 1=Fire, 2=Metal, 3=Water, 4=Earth

    // Wuxing cycle: Wood(0)->Earth(4)->Water(3)->Fire(1)->Metal(2)->Wood(0)
    // Overcomes: Wood overcomes Earth, Earth overcomes Water,
    //            Water overcomes Fire, Fire overcomes Metal, Metal overcomes Wood

    // ===== Angular Momentum =====

    /// Compute angular momentum from parts + launch power.
    /// L = inertia * efficiency * launch_power / 10000
    public fun compute_angular_momentum(
        ratchet: &Ratchet,
        bit: &Bit,
        launch_power: u16,
    ): u64 {
        let weight = (ratchet::weight(ratchet) as u64);
        let prong_mult = prong_multiplier(ratchet::prongs(ratchet));
        let inertia = weight * prong_mult;
        let friction_val = (bit::friction(bit) as u64);
        let efficiency = if (friction_val >= 100) { 1 } else { 100 - friction_val };
        inertia * efficiency * (launch_power as u64) / 10000
    }

    /// Prong multiplier: more prongs = more rim-weighted = higher moment of inertia.
    /// 0 prongs = 100 (base), each prong adds 10%.
    public fun prong_multiplier(prongs: u8): u64 {
        100 + ((prongs as u64) * 10)
    }

    // ===== Damage Computation =====

    /// Compute damage and recoil.
    /// raw = atk * atk_am / 1000
    /// dmg = raw * type_bonus * element_bonus * random_variance / 1_000_000
    /// recoil = dmg * recoil_factor / 100
    public fun compute_damage(
        atk_blade: &Blade,
        atk_am: u64,
        _def_blade: &Blade,
        type_bonus: u16,
        element_bonus: u16,
        random_variance: u16,
    ): (u64, u64) {
        let atk = (blade::attack(atk_blade) as u64);
        let raw = atk * atk_am / 1000;
        let dmg = raw * (type_bonus as u64) * (element_bonus as u64)
                  * (random_variance as u64) / 1_000_000;
        let recoil = dmg * (blade::recoil_factor(atk_blade) as u64) / 100;
        (dmg, recoil)
    }

    // ===== Spin Steal =====

    /// If opposite spin directions: 10% of damage transfers as AM.
    public fun compute_spin_steal(
        atk_blade: &Blade,
        def_blade: &Blade,
        damage: u64,
    ): u64 {
        if (blade::spin_direction(atk_blade) != blade::spin_direction(def_blade)) {
            damage / 10
        } else {
            0
        }
    }

    // ===== Type Advantage =====

    /// Returns type bonus as a percentage (100 = neutral).
    /// ATK(0) beats STA(2): +30% -> 130
    /// STA(2) beats DEF(1): +20% -> 120
    /// DEF(1) beats ATK(0): +40% recoil reflect -> returns 140
    /// BAL(3): +10% to all -> 110
    /// Neutral: 100
    public fun type_advantage(atk_type: u8, def_type: u8): u16 {
        if (atk_type == 3) {
            // BAL always gets +10%
            110
        } else if (def_type == 3) {
            // Attacking BAL: -10%
            90
        } else if (atk_type == 0 && def_type == 2) {
            // ATK > STA
            130
        } else if (atk_type == 2 && def_type == 1) {
            // STA > DEF
            120
        } else if (atk_type == 1 && def_type == 0) {
            // DEF > ATK (recoil reflect bonus)
            140
        } else {
            100
        }
    }

    // ===== Wuxing Elemental Bonus =====

    /// Returns element bonus as percentage (100 = neutral).
    /// Wuxing overcomes: Wood(0)->Earth(4)->Water(3)->Fire(1)->Metal(2)->Wood(0)
    /// Advantage: +20% -> 120
    /// Same element: -10% -> 90
    /// Earth(4) center: always neutral 100
    /// Neutral: 100
    public fun wuxing_bonus(atk_element: u8, def_element: u8): u16 {
        // Earth (center/Koryu) is neutral to all
        if (atk_element == 4 || def_element == 4) {
            return 100
        };
        // Same element = resistance
        if (atk_element == def_element) {
            return 90
        };
        // Check overcomes cycle: Wood(0)->Earth(4)->Water(3)->Fire(1)->Metal(2)->Wood(0)
        // But Earth is handled above, so effective cycle for non-earth:
        // Wood(0) overcomes Earth(4) - handled above
        // We need the non-earth part of the cycle for elements 0,1,2,3
        // Overcomes: 0->4, 4->3, 3->1, 1->2, 2->0
        // Since Earth is neutral, we only check: 3->1 (Water>Fire), 1->2 (Fire>Metal), 2->0 (Metal>Wood), 0->? 
        // Full cycle overcomes lookup:
        if (overcomes(atk_element, def_element)) {
            120
        } else {
            100
        }
    }

    /// Check if atk_element overcomes def_element in the Wuxing cycle.
    /// Wood(0)->Earth(4)->Water(3)->Fire(1)->Metal(2)->Wood(0)
    public fun overcomes(atk: u8, def: u8): bool {
        (atk == 0 && def == 4) || // Wood > Earth
        (atk == 4 && def == 3) || // Earth > Water
        (atk == 3 && def == 1) || // Water > Fire
        (atk == 1 && def == 2) || // Fire > Metal
        (atk == 2 && def == 0)    // Metal > Wood
    }

    // ===== Spin Decay =====

    /// Compute spin decay for a turn.
    /// decay = base_decay_bps * friction / 10000 * (100 + wobble_factor * 20) / 100
    public fun compute_spin_decay(
        am: u64,
        friction: u16,
        base_decay_bps: u16,
        wobble: u8,
    ): u64 {
        let base = am * (base_decay_bps as u64) / 10000;
        let friction_mod = base * (friction as u64) / 100;
        let wobble_mod = if (wobble > 0) {
            // Each wobble level adds 20% more decay
            friction_mod * (100 + (wobble as u64) * 20) / 100
        } else {
            friction_mod
        };
        // Minimum decay of 1 if AM > 0
        if (wobble_mod == 0 && am > 0) { 1 } else { wobble_mod }
    }

    /// Check if bey is in "death spin" (AM < 20% of initial).
    public fun is_death_spin(current_am: u64, initial_am: u64): bool {
        current_am * 5 < initial_am // current < 20% of initial
    }

    // ===== Burst Check =====

    /// Compute burst integrity loss from an impact.
    /// bi_loss = max(impact_force - burst_resistance, 0)
    /// Lock tightness: higher = more resistant but more stamina drain
    public fun compute_burst_loss(
        impact_force: u64,
        burst_resistance: u16,
        lock_tightness: u8,
    ): u64 {
        let resistance = (burst_resistance as u64) * (lock_tightness as u64) / 3;
        if (impact_force > resistance) {
            impact_force - resistance
        } else {
            0
        }
    }

    /// Stamina penalty from lock tightness on hit.
    public fun lock_tightness_drain(lock_tightness: u8, base_drain: u64): u64 {
        base_drain * (lock_tightness as u64) / 3
    }

    // ===== Knockback =====

    /// Check if knockback occurs: damage > defender_weight * 2
    public fun check_knockback(damage: u64, defender_weight: u16): bool {
        damage > (defender_weight as u64) * 2
    }
}
