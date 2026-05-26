use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use serde::Serialize;

use crate::db::queries;
use crate::AppState;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct PlayerProfile {
    pub address: String,
    pub elo: i32,
    pub wins: i32,
    pub losses: i32,
    pub rank: String,
    pub xp: i64,
    pub win_rate: f64,
    pub recent_matches: Vec<MatchSummary>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct MatchSummary {
    pub match_id: String,
    pub opponent: String,
    pub result: String,
    pub score: String,
    pub rounds_played: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub error: String,
    pub code: &'static str,
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn router() -> Router<AppState> {
    Router::new().route("/api/player/{address}", get(get_player))
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// GET /api/player/:address
///
/// Returns the player's profile, stats, ELO, and recent match history.
async fn get_player(
    State(state): State<AppState>,
    Path(address): Path<String>,
) -> Result<Json<PlayerProfile>, (axum::http::StatusCode, Json<ApiError>)> {
    let player = queries::get_player(&state.db, &address)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, address = %address, "Failed to fetch player");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Database error".into(), code: "DB_ERROR" }),
            )
        })?;

    let player = player.ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError {
                error: "Player not found".into(),
                code: "PLAYER_NOT_FOUND",
            }),
        )
    })?;

    let recent_matches = queries::get_recent_matches(&state.db, &address, 10)
        .await
        .unwrap_or_default();

    let total_games = player.wins + player.losses;
    let win_rate = if total_games > 0 {
        player.wins as f64 / total_games as f64
    } else {
        0.0
    };

    Ok(Json(PlayerProfile {
        address: player.address,
        elo: player.elo,
        wins: player.wins,
        losses: player.losses,
        rank: elo_to_rank(player.elo),
        xp: player.xp,
        win_rate,
        recent_matches,
        created_at: player.created_at,
    }))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Map ELO to a human-readable rank tier.
fn elo_to_rank(elo: i32) -> String {
    match elo {
        0..=799 => "Rookie".into(),
        800..=1099 => "Bronze".into(),
        1100..=1399 => "Silver".into(),
        1400..=1699 => "Gold".into(),
        1700..=1999 => "Platinum".into(),
        _ => "Diamond".into(),
    }
}
