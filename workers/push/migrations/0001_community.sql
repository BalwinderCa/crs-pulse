-- Community timelines: one row per sharing device. Holds only what the app's
-- toSharedSteps sends (milestone types, day offsets, optional months) plus the
-- AOR month. `owner` is a SHA-256 of the device's random key, never the key.
CREATE TABLE community_timelines (
  id         TEXT PRIMARY KEY,         -- public random id
  owner      TEXT NOT NULL UNIQUE,     -- sha256(device key), proves ownership
  alias      TEXT NOT NULL DEFAULT '',
  program    TEXT NOT NULL,
  aor_month  TEXT,                     -- "2026-08"
  steps      TEXT NOT NULL,            -- JSON [{type, day, month?}]
  stage      INTEGER NOT NULL,         -- index of the furthest stop reached
  last_day   INTEGER NOT NULL,
  updated_at INTEGER NOT NULL          -- epoch ms
);

CREATE INDEX idx_ct_recent ON community_timelines (updated_at DESC, id);
CREATE INDEX idx_ct_program_recent ON community_timelines (program, updated_at DESC, id);
