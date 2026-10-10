-- QuantumShield AI database schema (PostgreSQL). Safe to run more than once.
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS policies (
  user_id    BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memory (
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attack     TEXT   NOT NULL,
  data       JSONB  NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, attack)
);
CREATE TABLE IF NOT EXISTS incidents (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attack     TEXT NOT NULL,
  src        TEXT,
  risk       INT  NOT NULL,
  state      TEXT NOT NULL,
  emergency  BOOLEAN NOT NULL DEFAULT false,
  assets     JSONB NOT NULL DEFAULT '[]',
  actions    JSONB NOT NULL DEFAULT '[]',
  timeline   JSONB NOT NULL DEFAULT '[]',
  ttr        REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS incidents_user_idx ON incidents (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS audit (
  id      BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind    TEXT NOT NULL DEFAULT '',
  text    TEXT NOT NULL,
  at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_user_idx ON audit (user_id, at DESC);
CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT NOT NULL,
  at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts (email, at DESC);
