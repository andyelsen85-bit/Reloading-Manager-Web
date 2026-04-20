-- Migration 0005: Login audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id serial PRIMARY KEY,
  user_id integer,
  username text NOT NULL,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp NOT NULL DEFAULT now()
);
