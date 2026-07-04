-- Move session storage from KV to D1.
-- KV free tier = 1k writes/day; D1 free tier = 100k row writes/day.
-- Sessions were previously stored as KV keys `session:<id>` with 7-day TTL.
-- D1 has no auto-expiry: a scheduled cron (*/30) cleans expired rows.
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data        TEXT NOT NULL,
    expires_at  INTEGER NOT NULL,
    touched_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
