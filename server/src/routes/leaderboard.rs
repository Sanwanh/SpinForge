use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::db::queries;
use crate::AppState;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub address: String,
    pub elo: i32,
    pub wins: i32,
    pub losses: i32,
}

#[derive(Debug, Deserialize)]
pub struct LeaderboardQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct LeaderboardResponse {
    pub entries: Vec<LeaderboardEntry>,
    pub total: i64,
    pub season: Option<i32>,
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
    Router::new()
        .route("/api/leaderboard", get(global_leaderboard))
        .route("/api/leaderboard/{season}", get(season_leaderboard))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /api/leaderboard?limit=50&offset=0
///
/// Returns the global leaderboard sorted by ELO descending.
async fn global_leaderboard(
    State(state): State<AppState>,
    Query(params): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, (axum::http::StatusCode, Json<ApiError>)> {
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0).max(0);

    let entries = queries::get_leaderboard(&state.db, limit, offset)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to fetch leaderboard");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Database error".into(), code: "DB_ERROR" }),
            )
        })?;

    let total = queries::get_player_count(&state.db).await.unwrap_or(0);

    Ok(Json(LeaderboardResponse {
        entries,
        total,
        season: None,
    }))
}

/// GET /api/leaderboard/:season
///
/// Returns a snapshot of the leaderboard for a completed season.
async fn season_leaderboard(
    State(state): State<AppState>,
    Path(season): Path<i32>,
    Query(params): Query<LeaderboardQuery>,
) -> Result<Json<LeaderboardResponse>, (axum::http::StatusCode, Json<ApiError>)> {
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0).max(0);

    let entries = queries::get_season_leaderboard(&state.db, season, limit, offset)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, season = season, "Failed to fetch season leaderboard");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Database error".into(), code: "DB_ERROR" }),
            )
        })?;

    let total = queries::get_season_player_count(&state.db, season)
        .await
        .unwrap_or(0);

    Ok(Json(LeaderboardResponse {
        entries,
        total,
        season: Some(season),
    }))
}
