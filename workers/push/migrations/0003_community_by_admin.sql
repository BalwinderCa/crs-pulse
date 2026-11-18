-- 1 for timelines added from the dashboard (admin.crspulse.com), so the app can label them.
ALTER TABLE community_timelines ADD COLUMN by_admin INTEGER NOT NULL DEFAULT 0;
