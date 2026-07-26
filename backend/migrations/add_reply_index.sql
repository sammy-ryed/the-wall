-- Migration script to add index for reply pagination
-- Improves query performance for fetching replies ordered by creation time per confession

CREATE INDEX IF NOT EXISTS idx_reply_confession_created_at ON replies (confession_id, created_at DESC);
