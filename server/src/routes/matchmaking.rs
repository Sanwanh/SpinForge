use axum::{
    extract::{Path, State},
    routing::{delete, get, post},
    Json, Router,
};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;

/// ELO range for matchmaking: players are matched within +/- this value.
const ELO_MATCH_RANGE: i32 = 200;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct QueueRequest {
    pub player_address: String,
}

#[derive(Debug, Serialize)]
pub struct QueueResponse {
    pub ticket_id: String,
    pub status: &'static str,
}

#[derive(Debug, Serialize)]
pub struct MatchmakingStatus {
    pub ticket_id: String,
    pub status: String,
    pub opponent: Option<String>,
    pub match_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CancelResponse {
    pub cancelled: bool,
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
        .route("/api/matchmaking/queue", post(queue_handler))
        .route("/api/matchmaking/status/{id}", get(status_handler))
        .route("/api/matchmaking/cancel/{id}", delete(cancel_handler))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /api/matchmaking/queue
///
/// Add a player to the matchmaking queue. Their ELO is fetched from PostgreSQL
/// and stored in a Redis sorted set keyed by ELO for range-based matching.
async fn queue_handler(
    State(state): State<AppState>,
    Json(body): Json<QueueRequest>,
) -> Result<Json<QueueResponse>, (axum::http::StatusCode, Json<ApiError>)> {
    // Fetch player ELO from the database.
    let elo = sqlx::query_scalar::<_, i32>(
        "SELECT elo FROM players WHERE address = $1",
    )
    .bind(&body.player_address)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "DB error fetching player ELO");
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError { error: "Database error".into(), code: "DB_ERROR" }),
        )
    })?
    .unwrap_or(1000); // Default ELO for new players.

    let ticket_id = Uuid::new_v4().to_string();
    let mut conn = state.redis.clone();

    // Store the ticket in Redis with player info.
    let ticket_key = format!("mm:ticket:{ticket_id}");
    let _: () = redis::pipe()
        .cmd("HSET")
        .arg(&ticket_key)
        .arg("player")
        .arg(&body.player_address)
        .arg("elo")
        .arg(elo)
        .arg("status")
        .arg("waiting")
        .cmd("EXPIRE")
        .arg(&ticket_key)
        .arg(300) // 5-minute TTL
        .query_async(&mut conn)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Redis error storing ticket");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Cache error".into(), code: "CACHE_ERROR" }),
            )
        })?;

    // Add to the sorted set for range-based matching.
    let _: () = conn
        .zadd("mm:queue", &ticket_id, elo)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Redis error adding to queue");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Cache error".into(), code: "CACHE_ERROR" }),
            )
        })?;

    // Attempt immediate match: find another ticket within ELO range.
    try_match(&state, &ticket_id, elo, &body.player_address).await;

    tracing::info!(
        player = %body.player_address,
        elo = elo,
        ticket = %ticket_id,
        "Player queued for matchmaking"
    );

    Ok(Json(QueueResponse {
        ticket_id,
        status: "queued",
    }))
}

/// GET /api/matchmaking/status/:id
async fn status_handler(
    State(state): State<AppState>,
    Path(ticket_id): Path<String>,
) -> Result<Json<MatchmakingStatus>, (axum::http::StatusCode, Json<ApiError>)> {
    let mut conn = state.redis.clone();
    let ticket_key = format!("mm:ticket:{ticket_id}");

    let result: Option<Vec<String>> = redis::cmd("HGETALL")
        .arg(&ticket_key)
        .query_async(&mut conn)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Redis error fetching ticket");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Cache error".into(), code: "CACHE_ERROR" }),
            )
        })?;

    let fields = result.unwrap_or_default();
    if fields.is_empty() {
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError { error: "Ticket not found".into(), code: "TICKET_NOT_FOUND" }),
        ));
    }

    // Parse hash fields into a map.
    let map = hash_vec_to_map(&fields);

    Ok(Json(MatchmakingStatus {
        ticket_id,
        status: map.get("status").cloned().unwrap_or_else(|| "unknown".into()),
        opponent: map.get("opponent").cloned(),
        match_id: map.get("match_id").cloned(),
    }))
}

/// DELETE /api/matchmaking/cancel/:id
async fn cancel_handler(
    State(state): State<AppState>,
    Path(ticket_id): Path<String>,
) -> Result<Json<CancelResponse>, (axum::http::StatusCode, Json<ApiError>)> {
    let mut conn = state.redis.clone();
    let ticket_key = format!("mm:ticket:{ticket_id}");

    // Remove from sorted set and delete ticket hash.
    let _: () = redis::pipe()
        .cmd("ZREM")
        .arg("mm:queue")
        .arg(&ticket_id)
        .cmd("DEL")
        .arg(&ticket_key)
        .query_async(&mut conn)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Redis error cancelling ticket");
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError { error: "Cache error".into(), code: "CACHE_ERROR" }),
            )
        })?;

    tracing::info!(ticket = %ticket_id, "Matchmaking ticket cancelled");

    Ok(Json(CancelResponse { cancelled: true }))
}

// ---------------------------------------------------------------------------
// Matchmaking logic
// ---------------------------------------------------------------------------

/// Try to find an opponent within `ELO_MATCH_RANGE` of the given player's ELO.
/// If found, update both tickets to "matched" and record the match_id.
async fn try_match(
    state: &AppState,
    ticket_id: &str,
    elo: i32,
    player_address: &str,
) {
    let mut conn = state.redis.clone();

    let low = (elo - ELO_MATCH_RANGE) as f64;
    let high = (elo + ELO_MATCH_RANGE) as f64;

    // Find candidates in ELO range (excluding self).
    let candidates: Vec<String> = match conn
        .zrangebyscore_limit("mm:queue", low, high, 0, 10)
        .await
    {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!(error = %e, "Failed to query matchmaking queue");
            return;
        }
    };

    for candidate_ticket in &candidates {
        if candidate_ticket == ticket_id {
            continue;
        }

        let candidate_key = format!("mm:ticket:{candidate_ticket}");
        let status: Option<String> = conn.hget(&candidate_key, "status").await.unwrap_or(None);

        if status.as_deref() != Some("waiting") {
            continue;
        }

        let opponent_address: Option<String> =
            conn.hget(&candidate_key, "player").await.unwrap_or(None);

        if let Some(opponent) = opponent_address {
            // Prevent self-match.
            if opponent == player_address {
                continue;
            }

            let match_id = Uuid::new_v4().to_string();

            // Update both tickets atomically.
            let my_key = format!("mm:ticket:{ticket_id}");
            let _: Result<(), _> = redis::pipe()
                .cmd("HSET").arg(&my_key).arg("status").arg("matched")
                    .arg("opponent").arg(&opponent)
                    .arg("match_id").arg(&match_id)
                .cmd("HSET").arg(&candidate_key).arg("status").arg("matched")
                    .arg("opponent").arg(player_address)
                    .arg("match_id").arg(&match_id)
                .cmd("ZREM").arg("mm:queue").arg(ticket_id)
                .cmd("ZREM").arg("mm:queue").arg(candidate_ticket.as_str())
                .query_async(&mut conn)
                .await;

            tracing::info!(
                match_id = %match_id,
                player_a = %player_address,
                player_b = %opponent,
                "Match created"
            );
            return;
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn hash_vec_to_map(fields: &[String]) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    let mut iter = fields.iter();
    while let (Some(key), Some(value)) = (iter.next(), iter.next()) {
        map.insert(key.clone(), value.clone());
    }
    map
}
