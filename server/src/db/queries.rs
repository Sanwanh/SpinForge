//! Database query functions.
//!
//! Every function takes a `&PgPool` reference and returns `Result<T, sqlx::Error>`.
//! No side-effects beyond the database operation itself — pure data access.

use sqlx::PgPool;
use uuid::Uuid;

use crate::routes::leaderboard::LeaderboardEntry;
use crate::routes::player::MatchSummary;
use crate::routes::tournament::{BracketEntry, TournamentSummary};

// ---------------------------------------------------------------------------
// Player row returned from the DB.
// ---------------------------------------------------------------------------

pub struct PlayerRow {
    pub address: String,
    pub elo: i32,
    pub wins: i32,
    pub losses: i32,
    pub rank: String,
    pub xp: i64,
    pub created_at: String,
}

pub struct TournamentRow {
    pub id: Uuid,
    pub name: String,
    pub status: String,
    pub max_players: i32,
    pub on_chain_id: Option<String>,
    pub created_at: String,
}

// ---------------------------------------------------------------------------
// Player queries
// ---------------------------------------------------------------------------

pub async fn get_player(pool: &PgPool, address: &str) -> Result<Option<PlayerRow>, sqlx::Error> {
    let row = sqlx::query_as!(
        PlayerRow,
        r#"
        SELECT
            address,
            elo,
            wins,
            losses,
            rank,
            xp,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "created_at!"
        FROM players
        WHERE address = $1
        "#,
        address
    )
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

pub async fn upsert_player(pool: &PgPool, address: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO players (address)
        VALUES ($1)
        ON CONFLICT (address) DO NOTHING
        "#,
        address
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// Standard ELO update with K=32.
pub async fn update_player_elo(
    pool: &PgPool,
    address: &str,
    new_elo: i32,
    won: bool,
    xp_gained: i64,
) -> Result<(), sqlx::Error> {
    if won {
        sqlx::query!(
            r#"
            UPDATE players
            SET elo = $2, wins = wins + 1, xp = xp + $3
            WHERE address = $1
            "#,
            address,
            new_elo,
            xp_gained,
        )
        .execute(pool)
        .await?;
    } else {
        sqlx::query!(
            r#"
            UPDATE players
            SET elo = $2, losses = losses + 1, xp = xp + $3
            WHERE address = $1
            "#,
            address,
            new_elo,
            xp_gained,
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Match queries
// ---------------------------------------------------------------------------

pub async fn insert_match(
    pool: &PgPool,
    player_a: &str,
    player_b: &str,
    score_a: i16,
    score_b: i16,
    winner: Option<&str>,
    stadium_id: Option<&str>,
    rounds_played: i16,
    on_chain_id: Option<&str>,
) -> Result<Uuid, sqlx::Error> {
    let id = sqlx::query_scalar!(
        r#"
        INSERT INTO matches (player_a, player_b, score_a, score_b, winner, stadium_id, rounds_played, on_chain_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
        "#,
        player_a,
        player_b,
        score_a,
        score_b,
        winner,
        stadium_id,
        rounds_played,
        on_chain_id,
    )
    .fetch_one(pool)
    .await?;

    Ok(id)
}

pub async fn insert_round(
    pool: &PgPool,
    match_id: Uuid,
    bey_a_id: &str,
    bey_b_id: &str,
    finish_type: Option<&str>,
    points: Option<i16>,
    turn_count: i16,
) -> Result<Uuid, sqlx::Error> {
    let id = sqlx::query_scalar!(
        r#"
        INSERT INTO rounds (match_id, bey_a_id, bey_b_id, finish_type, points, turn_count)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#,
        match_id,
        bey_a_id,
        bey_b_id,
        finish_type,
        points,
        turn_count,
    )
    .fetch_one(pool)
    .await?;

    Ok(id)
}

pub async fn insert_match_event(
    pool: &PgPool,
    match_id: Uuid,
    round_id: Option<Uuid>,
    event_type: &str,
    payload: serde_json::Value,
) -> Result<Uuid, sqlx::Error> {
    let id = sqlx::query_scalar!(
        r#"
        INSERT INTO match_events (match_id, round_id, event_type, payload)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
        match_id,
        round_id,
        event_type,
        payload,
    )
    .fetch_one(pool)
    .await?;

    Ok(id)
}

pub async fn get_recent_matches(
    pool: &PgPool,
    address: &str,
    limit: i64,
) -> Result<Vec<MatchSummary>, sqlx::Error> {
    let rows = sqlx::query!(
        r#"
        SELECT
            m.id,
            CASE WHEN m.player_a = $1 THEN m.player_b ELSE m.player_a END AS "opponent!",
            CASE WHEN m.winner = $1 THEN 'win'
                 WHEN m.winner IS NULL THEN 'draw'
                 ELSE 'loss'
            END AS "result!",
            m.score_a,
            m.score_b,
            m.rounds_played,
            to_char(m.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "created_at!"
        FROM matches m
        WHERE m.player_a = $1 OR m.player_b = $1
        ORDER BY m.created_at DESC
        LIMIT $2
        "#,
        address,
        limit,
    )
    .fetch_all(pool)
    .await?;

    let summaries = rows
        .into_iter()
        .map(|r| MatchSummary {
            match_id: r.id.to_string(),
            opponent: r.opponent,
            result: r.result,
            score: format!("{}-{}", r.score_a, r.score_b),
            rounds_played: r.rounds_played as i32,
            created_at: r.created_at,
        })
        .collect();

    Ok(summaries)
}

// ---------------------------------------------------------------------------
// Leaderboard queries
// ---------------------------------------------------------------------------

pub async fn get_leaderboard(
    pool: &PgPool,
    limit: i64,
    offset: i64,
) -> Result<Vec<LeaderboardEntry>, sqlx::Error> {
    let rows = sqlx::query!(
        r#"
        SELECT
            ROW_NUMBER() OVER (ORDER BY elo DESC) AS "rank!",
            address,
            elo,
            wins,
            losses
        FROM players
        ORDER BY elo DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset,
    )
    .fetch_all(pool)
    .await?;

    let entries = rows
        .into_iter()
        .map(|r| LeaderboardEntry {
            rank: r.rank,
            address: r.address,
            elo: r.elo,
            wins: r.wins,
            losses: r.losses,
        })
        .collect();

    Ok(entries)
}

pub async fn get_player_count(pool: &PgPool) -> Result<i64, sqlx::Error> {
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM players")
        .fetch_one(pool)
        .await?;

    Ok(count.unwrap_or(0))
}

pub async fn get_season_leaderboard(
    pool: &PgPool,
    season: i32,
    limit: i64,
    offset: i64,
) -> Result<Vec<LeaderboardEntry>, sqlx::Error> {
    let rows = sqlx::query!(
        r#"
        SELECT
            ls.rank AS "rank!: i64",
            ls.address,
            ls.elo,
            p.wins,
            p.losses
        FROM leaderboard_snapshots ls
        JOIN players p ON p.address = ls.address
        WHERE ls.season = $1
        ORDER BY ls.rank ASC
        LIMIT $2 OFFSET $3
        "#,
        season,
        limit,
        offset,
    )
    .fetch_all(pool)
    .await?;

    let entries = rows
        .into_iter()
        .map(|r| LeaderboardEntry {
            rank: r.rank,
            address: r.address,
            elo: r.elo,
            wins: r.wins,
            losses: r.losses,
        })
        .collect();

    Ok(entries)
}

pub async fn get_season_player_count(pool: &PgPool, season: i32) -> Result<i64, sqlx::Error> {
    let count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM leaderboard_snapshots WHERE season = $1",
        season
    )
    .fetch_one(pool)
    .await?;

    Ok(count.unwrap_or(0))
}

pub async fn insert_leaderboard_snapshot(
    pool: &PgPool,
    season: i32,
    address: &str,
    elo: i32,
    rank: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO leaderboard_snapshots (season, address, elo, rank)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (season, address) DO UPDATE SET elo = $3, rank = $4
        "#,
        season,
        address,
        elo,
        rank,
    )
    .execute(pool)
    .await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Tournament queries
// ---------------------------------------------------------------------------

pub async fn list_tournaments(pool: &PgPool) -> Result<Vec<TournamentSummary>, sqlx::Error> {
    let rows = sqlx::query!(
        r#"
        SELECT
            t.id,
            t.name,
            t.status,
            t.max_players,
            t.on_chain_id,
            to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "created_at!",
            (SELECT COUNT(*) FROM tournament_entries te WHERE te.tournament_id = t.id) AS "current_players!"
        FROM tournaments t
        ORDER BY t.created_at DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    let summaries = rows
        .into_iter()
        .map(|r| TournamentSummary {
            id: r.id.to_string(),
            name: r.name,
            status: r.status,
            max_players: r.max_players,
            current_players: r.current_players,
            on_chain_id: r.on_chain_id,
            created_at: r.created_at,
        })
        .collect();

    Ok(summaries)
}

pub async fn get_tournament(
    pool: &PgPool,
    id: Uuid,
) -> Result<Option<TournamentRow>, sqlx::Error> {
    let row = sqlx::query_as!(
        TournamentRow,
        r#"
        SELECT
            id,
            name,
            status,
            max_players,
            on_chain_id,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "created_at!"
        FROM tournaments
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

pub async fn insert_tournament(
    pool: &PgPool,
    name: &str,
    max_players: i32,
    on_chain_id: Option<&str>,
) -> Result<Uuid, sqlx::Error> {
    let id = sqlx::query_scalar!(
        r#"
        INSERT INTO tournaments (name, max_players, on_chain_id)
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
        name,
        max_players,
        on_chain_id,
    )
    .fetch_one(pool)
    .await?;

    Ok(id)
}

pub async fn get_tournament_entry_count(
    pool: &PgPool,
    tournament_id: Uuid,
) -> Result<i64, sqlx::Error> {
    let count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM tournament_entries WHERE tournament_id = $1",
        tournament_id,
    )
    .fetch_one(pool)
    .await?;

    Ok(count.unwrap_or(0))
}

pub async fn insert_tournament_entry(
    pool: &PgPool,
    tournament_id: Uuid,
    player_address: &str,
    seed: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO tournament_entries (tournament_id, player_address, seed)
        VALUES ($1, $2, $3)
        "#,
        tournament_id,
        player_address,
        seed,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_tournament_bracket(
    pool: &PgPool,
    tournament_id: Uuid,
) -> Result<Vec<BracketEntry>, sqlx::Error> {
    let rows = sqlx::query!(
        r#"
        SELECT player_address, seed, eliminated_round
        FROM tournament_entries
        WHERE tournament_id = $1
        ORDER BY seed ASC
        "#,
        tournament_id,
    )
    .fetch_all(pool)
    .await?;

    let entries = rows
        .into_iter()
        .map(|r| BracketEntry {
            player_address: r.player_address,
            seed: r.seed,
            eliminated_round: r.eliminated_round,
        })
        .collect();

    Ok(entries)
}

// ---------------------------------------------------------------------------
// ELO calculation
// ---------------------------------------------------------------------------

/// Standard ELO formula with K-factor of 32.
///
/// Returns `(new_elo_a, new_elo_b)` after the match result.
/// `score_a` is 1.0 for a win, 0.0 for a loss, 0.5 for a draw.
pub fn calculate_elo(elo_a: i32, elo_b: i32, score_a: f64) -> (i32, i32) {
    const K: f64 = 32.0;

    let expected_a = 1.0 / (1.0 + 10.0_f64.powf((elo_b - elo_a) as f64 / 400.0));
    let expected_b = 1.0 - expected_a;

    let score_b = 1.0 - score_a;

    let new_a = elo_a + (K * (score_a - expected_a)).round() as i32;
    let new_b = elo_b + (K * (score_b - expected_b)).round() as i32;

    (new_a.max(0), new_b.max(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn elo_symmetric_on_draw() {
        let (a, b) = calculate_elo(1000, 1000, 0.5);
        assert_eq!(a, 1000);
        assert_eq!(b, 1000);
    }

    #[test]
    fn elo_winner_gains_loser_loses() {
        let (a, b) = calculate_elo(1000, 1000, 1.0);
        assert!(a > 1000);
        assert!(b < 1000);
        // K=32 even match: winner gets +16, loser gets -16
        assert_eq!(a, 1016);
        assert_eq!(b, 984);
    }

    #[test]
    fn elo_upset_gives_more_points() {
        let (underdog_new, favorite_new) = calculate_elo(800, 1200, 1.0);
        // Underdog wins: should gain significantly more than 16.
        assert!(underdog_new - 800 > 16);
        assert!(1200 - favorite_new > 16);
    }

    #[test]
    fn elo_never_negative() {
        let (a, _b) = calculate_elo(0, 2000, 0.0);
        assert!(a >= 0);
    }
}
