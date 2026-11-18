-- Preset avatar id (drawn in the app; no image is stored), and moderation.
ALTER TABLE community_timelines ADD COLUMN avatar TEXT;
-- 1 once enough people report it; hidden rows are left out of every read.
ALTER TABLE community_timelines ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;

-- One report per reporter per timeline. `reporter` is a hash (of the device's
-- community key, or of the IP when it has none), never the key or IP itself.
CREATE TABLE community_reports (
  timeline_id TEXT NOT NULL,
  reporter    TEXT NOT NULL,
  reason      TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (timeline_id, reporter)
);
