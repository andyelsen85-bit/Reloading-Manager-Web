-- Migration 0006: Add photo_base64 to powders and primers
ALTER TABLE powders ADD COLUMN IF NOT EXISTS photo_base64 text;
ALTER TABLE primers ADD COLUMN IF NOT EXISTS photo_base64 text;
