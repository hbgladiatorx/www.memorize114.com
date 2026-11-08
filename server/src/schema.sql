-- memorize114 database schema. Safe to run repeatedly (npm run migrate).

CREATE TABLE IF NOT EXISTS users (
  id                bigserial PRIMARY KEY,
  email             text NOT NULL UNIQUE,            -- stored lower-case
  name              text NOT NULL,
  password_hash     text NOT NULL,
  role              text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  email_verified_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_active_at    timestamptz
);

-- Login sessions. Only a SHA-256 hash of the cookie value is stored.
CREATE TABLE IF NOT EXISTS sessions (
  id_hash    text PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_agent text
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

-- One-time tokens for password reset and email confirmation (hashed).
CREATE TABLE IF NOT EXISTS tokens (
  hash       text PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('reset', 'verify')),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

-- App settings per user (language, daily plan, reciter…), as the app sends them.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Memorisation progress, one row per user per sūrah.
CREATE TABLE IF NOT EXISTS progress (
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah      smallint NOT NULL CHECK (surah BETWEEN 1 AND 114),
  data       jsonb NOT NULL,
  started    integer NOT NULL DEFAULT 0,          -- verses with a schedule, for quick stats
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, surah)
);

-- Daily activity counts, for streaks and the admin charts.
CREATE TABLE IF NOT EXISTS activity (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     date NOT NULL,
  count   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS activity_day_idx ON activity(day);

CREATE TABLE IF NOT EXISTS classes (
  id         bigserial PRIMARY KEY,
  teacher_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  code       text NOT NULL UNIQUE,
  surahs     smallint[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_members (
  class_id  bigint NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id   bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, user_id)
);
CREATE INDEX IF NOT EXISTS class_members_user_idx ON class_members(user_id);
