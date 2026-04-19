-- Migration 0004: Link loads to charge_ladders for integrated ladder mode
ALTER TABLE loads ADD COLUMN IF NOT EXISTS charge_ladder_id integer REFERENCES charge_ladders(id) ON DELETE SET NULL;
