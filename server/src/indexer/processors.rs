//! Event processors — each function receives parsed event data and persists
//! the relevant records to PostgreSQL.

use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;

use crate::db::queries;

use super::event_listener::{
    BurstData, MatchCompletedData, PartForgedData, RoundResolvedData,
    SpinStealData, SpiritAvatarData, XtremeDashData,
};

// ---------------------------------------------------------------------------
// MatchCompleted
// ---------------------------------------------------------------------------

/// Process a completed match:
/// 1. Ensure both players exist in the database.
/// 2. Insert the match record.
/// 3. Compute and update ELO ratings for both players.
pub async fn process_match_completed(db: &PgPool, data: MatchCompletedData) -> Result<()> {
    tracing::info!(
        match_id = %data.match_id,
        player_a = %data.player_a,
        player_b = %data.player_b,
        winner = %data.winner,
        score = %format!("{}-{}", data.score_a, data.score_b),
        "Processing MatchCompleted"
    );

    // Ensure both players exist (upsert).
    queries::upsert_player(db, &data.player_a).await?;
    queries::upsert_player(db, &data.player_b).await?;

    // Fetch current ELOs.
    let player_a = queries::get_player(db, &data.player_a)
        .await?
        .expect("player_a must exist after upsert");
    let player_b = queries::get_player(db, &data.player_b)
        .await?
        .expect("player_b must exist after upsert");

    // Determine match outcome for ELO calculation.
    let score_a_elo = if data.winner == data.player_a {
        1.0
    } else if data.winner == data.player_b {
        0.0
    } else {
        0.5 // draw
    };

    let (new_elo_a, new_elo_b) = queries::calculate_elo(player_a.elo, player_b.elo, score_a_elo);

    // XP: winner gets 15-40 based on rounds, loser gets 5-15.
    let xp_winner = 15 + (data.rounds_played as i64) * 5;
    let xp_loser = 5 + (data.rounds_played as i64) * 2;

    let a_won = data.winner == data.player_a;
    queries::update_player_elo(
        db,
        &data.player_a,
        new_elo_a,
        a_won,
        if a_won { xp_winner } else { xp_loser },
    )
    .await?;

    queries::update_player_elo(
        db,
        &data.player_b,
        new_elo_b,
        !a_won,
        if a_won { xp_loser } else { xp_winner },
    )
    .await?;

    // Insert the match record.
    let winner_ref = if data.winner.is_empty() {
        None
    } else {
        Some(data.winner.as_str())
    };

    queries::insert_match(
        db,
        &data.player_a,
        &data.player_b,
        data.score_a as i16,
        data.score_b as i16,
        winner_ref,
        Some(&data.stadium_id),
        data.rounds_played as i16,
        Some(&data.match_id),
    )
    .await?;

    tracing::info!(
        match_id = %data.match_id,
        elo_a = new_elo_a,
        elo_b = new_elo_b,
        "ELO ratings updated"
    );

    Ok(())
}

// ---------------------------------------------------------------------------
// RoundResolved
// ---------------------------------------------------------------------------

pub async fn process_round_resolved(db: &PgPool, data: RoundResolvedData) -> Result<()> {
    tracing::info!(
        match_id = %data.match_id,
        round = data.round_number,
        finish = %data.finish_type,
        "Processing RoundResolved"
    );

    // Find the internal match UUID by on_chain_id.
    let match_uuid = find_match_by_on_chain_id(db, &data.match_id).await?;

    if let Some(match_id) = match_uuid {
        queries::insert_round(
            db,
            match_id,
            &data.bey_a_id,
            &data.bey_b_id,
            Some(&data.finish_type),
            Some(data.points as i16),
            data.turn_count as i16,
        )
        .await?;
    } else {
        tracing::warn!(
            on_chain_id = %data.match_id,
            "Match not found in DB for RoundResolved event"
        );
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// XtremeDashTriggered
// ---------------------------------------------------------------------------

pub async fn process_xtreme_dash(db: &PgPool, data: XtremeDashData) -> Result<()> {
    tracing::info!(
        match_id = %data.match_id,
        attacker = %data.attacker,
        hit = data.hit,
        damage = data.damage,
        "Processing XtremeDashTriggered"
    );

    let match_uuid = find_match_by_on_chain_id(db, &data.match_id).await?;
    if let Some(match_id) = match_uuid {
        let payload = serde_json::json!({
            "attacker": data.attacker,
            "gear_rating": data.gear_rating,
            "hit": data.hit,
            "damage": data.damage,
        });
        queries::insert_match_event(db, match_id, None, "xtreme_dash", payload).await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// BurstTriggered
// ---------------------------------------------------------------------------

pub async fn process_burst(db: &PgPool, data: BurstData) -> Result<()> {
    tracing::info!(
        match_id = %data.match_id,
        victim = %data.victim,
        "Processing BurstTriggered"
    );

    let match_uuid = find_match_by_on_chain_id(db, &data.match_id).await?;
    if let Some(match_id) = match_uuid {
        let payload = serde_json::json!({
            "victim": data.victim,
            "burst_integrity_remaining": data.burst_integrity_remaining,
            "impact_force": data.impact_force,
        });
        queries::insert_match_event(db, match_id, None, "burst", payload).await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// SpinStealOccurred
// ---------------------------------------------------------------------------

pub async fn process_spin_steal(db: &PgPool, data: SpinStealData) -> Result<()> {
    tracing::debug!(
        match_id = %data.match_id,
        stealer = %data.stealer,
        amount = data.amount,
        "Processing SpinStealOccurred"
    );

    let match_uuid = find_match_by_on_chain_id(db, &data.match_id).await?;
    if let Some(match_id) = match_uuid {
        let payload = serde_json::json!({
            "stealer": data.stealer,
            "amount": data.amount,
        });
        queries::insert_match_event(db, match_id, None, "spin_steal", payload).await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// PartForged
// ---------------------------------------------------------------------------

pub async fn process_part_forged(db: &PgPool, data: PartForgedData) -> Result<()> {
    tracing::info!(
        player = %data.player,
        part_type = %data.part_type,
        rarity = data.rarity,
        "Processing PartForged"
    );

    // Ensure the player exists.
    queries::upsert_player(db, &data.player).await?;

    // Part forging doesn't map to a match, so we just log it.
    // A dedicated `forge_events` table could be added later for analytics.

    Ok(())
}

// ---------------------------------------------------------------------------
// SpiritAvatarMinted
// ---------------------------------------------------------------------------

pub async fn process_spirit_avatar_minted(db: &PgPool, data: SpiritAvatarData) -> Result<()> {
    tracing::info!(
        player = %data.player,
        beast = data.beast,
        tier = data.tier,
        "Processing SpiritAvatarMinted"
    );

    // Ensure the player exists.
    queries::upsert_player(db, &data.player).await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Look up the internal UUID for a match by its on-chain ID.
async fn find_match_by_on_chain_id(db: &PgPool, on_chain_id: &str) -> Result<Option<Uuid>> {
    let row = sqlx::query_scalar!(
        "SELECT id FROM matches WHERE on_chain_id = $1",
        on_chain_id
    )
    .fetch_optional(db)
    .await?;

    Ok(row)
}
