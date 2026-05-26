-- SpinForge PostgreSQL Schema
-- Run with: psql -d spinforge -f schema.sql
-- Or via sqlx migrations in server/src/db/migrations/

-- ==========================================================================
-- PLAYERS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS players (
    address     TEXT PRIMARY KEY,
    elo         INTEGER NOT NULL DEFAULT 1000,
    wins        INTEGER NOT NULL DEFAULT 0,
    losses      INTEGER NOT NULL DEFAULT 0,
    rank        TEXT NOT NULL DEFAULT 'Rookie',
    xp          BIGINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_elo ON players (elo DESC);
CREATE INDEX IF NOT EXISTS idx_players_rank ON players (rank);
CREATE INDEX IF NOT EXISTS idx_players_xp ON players (xp DESC);

-- ==========================================================================
-- MATCHES
-- ==========================================================================
CREATE TABLE IF NOT EXISTS matches (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_a      TEXT NOT NULL REFERENCES players(address),
    player_b      TEXT NOT NULL REFERENCES players(address),
    score_a       SMALLINT NOT NULL DEFAULT 0,
    score_b       SMALLINT NOT NULL DEFAULT 0,
    winner        TEXT REFERENCES players(address),
    stadium_id    TEXT,
    rounds_played SMALLINT NOT NULL DEFAULT 0,
    on_chain_id   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_player_a ON matches (player_a, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_player_b ON matches (player_b, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches (winner) WHERE winner IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_on_chain ON matches (on_chain_id) WHERE on_chain_id IS NOT NULL;

-- ==========================================================================
-- ROUNDS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS rounds (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    bey_a_id    TEXT NOT NULL,
    bey_b_id    TEXT NOT NULL,
    finish_type TEXT,          -- 'spin', 'over', 'burst', 'xtreme', NULL (draw)
    points      SMALLINT,
    turn_count  SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rounds_match ON rounds (match_id);

-- ==========================================================================
-- MATCH EVENTS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS match_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    round_id    UUID REFERENCES rounds(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,  -- 'xtreme_dash', 'burst', 'spin_steal', etc.
    payload     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events (match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_match_events_type ON match_events (event_type);

-- ==========================================================================
-- LEADERBOARD SNAPSHOTS (end-of-season freezes)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season      INTEGER NOT NULL,
    address     TEXT NOT NULL REFERENCES players(address),
    elo         INTEGER NOT NULL,
    rank        INTEGER NOT NULL,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (season, address)
);

CREATE INDEX IF NOT EXISTS idx_lb_snapshots_season ON leaderboard_snapshots (season, rank ASC);

-- ==========================================================================
-- TOURNAMENTS
-- ==========================================================================
CREATE TABLE IF NOT EXISTS tournaments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open',  -- 'open', 'in_progress', 'completed'
    max_players INTEGER NOT NULL DEFAULT 32,
    on_chain_id TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments (status);

-- ==========================================================================
-- TOURNAMENT ENTRIES
-- ==========================================================================
CREATE TABLE IF NOT EXISTS tournament_entries (
    tournament_id    UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_address   TEXT NOT NULL REFERENCES players(address),
    seed             INTEGER NOT NULL,
    eliminated_round INTEGER,

    PRIMARY KEY (tournament_id, player_address)
);

CREATE INDEX IF NOT EXISTS idx_tournament_entries_player ON tournament_entries (player_address);

-- ==========================================================================
-- Trigger: auto-update `updated_at` on players
-- ==========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_players_updated_at ON players;
CREATE TRIGGER trg_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
