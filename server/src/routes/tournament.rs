use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::queries;
use crate::AppState;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct TournamentSummary {
    pub id: String,
    pub name: String,
    pub status: String,
    pub max_players: i32,
    pub current_players: i64,
    pub on_chain_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub tournament_id: String,
    pub player_address: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    pub registered: bool,
    pub seed: i32,
}

#[derive(Debug, Serialize)]
pub struct BracketEntry {
    pub player_address: String,
    pub seed: i32,
    pub eliminated_round: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct BracketResponse {
    pub tournament_id: String,
    pub entries: Vec<BracketEntry>,
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
        .route("/api/tournaments", get(list_tournaments))
        .route("/api/tournaments/register", post(register))
        .route("/api/tournaments/{id}/bracket", get(get_bracket))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /api/tournaments
async fn list_tournaments(
    State(state): State<AppState>,
) -> Result<Json<Vec<TournamentSummary>>, (axum::http::StatusCode, Json<ApiError>)> {
    let tournaments = queries::list_tournaments(&state.db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to list tournaments");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Database error".into(), code: "DB_ERROR" }),
            )
        })?;

    Ok(Json(tournaments))
}

/// POST /api/tournaments/register
async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<RegisterResponse>, (axum::http::StatusCode, Json<ApiError>)> {
    let tournament_id: Uuid = body.tournament_id.parse().map_err(|_| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError { error: "Invalid tournament ID".into(), code: "INVALID_ID" }),
        )
    })?;

    // Check tournament exists and is open for registration.
    let tournament = queries::get_tournament(&state.db, tournament_id)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to fetch tournament");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Database error".into(), code: "DB_ERROR" }),
            )
        })?;

    let tournament = tournament.ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError { error: "Tournament not found".into(), code: "NOT_FOUND" }),
        )
    })?;

    if tournament.status != "open" {
        return Err((
            axum::http::StatusCode::CONFLICT,
            Json(ApiError {
                error: "Tournament is not open for registration".into(),
                code: "TOURNAMENT_CLOSED",
            }),
        ));
    }

    let current_count = queries::get_tournament_entry_count(&state.db, tournament_id)
        .await
        .unwrap_or(0);

    if current_count >= tournament.max_players as i64 {
        return Err((
            axum::http::StatusCode::CONFLICT,
            Json(ApiError {
                error: "Tournament is full".into(),
                code: "TOURNAMENT_FULL",
            }),
        ));
    }

    let seed = (current_count + 1) as i32;

    queries::insert_tournament_entry(&state.db, tournament_id, &body.player_address, seed)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to register for tournament");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Database error".into(), code: "DB_ERROR" }),
            )
        })?;

    tracing::info!(
        player = %body.player_address,
        tournament = %tournament_id,
        seed = seed,
        "Player registered for tournament"
    );

    Ok(Json(RegisterResponse {
        registered: true,
        seed,
    }))
}

/// GET /api/tournaments/:id/bracket
async fn get_bracket(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<BracketResponse>, (axum::http::StatusCode, Json<ApiError>)> {
    let tournament_id: Uuid = id.parse().map_err(|_| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError { error: "Invalid tournament ID".into(), code: "INVALID_ID" }),
        )
    })?;

    let entries = queries::get_tournament_bracket(&state.db, tournament_id)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to fetch bracket");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Database error".into(), code: "DB_ERROR" }),
            )
        })?;

    Ok(Json(BracketResponse {
        tournament_id: id,
        entries,
    }))
}
