-- Join the Bunker cloud save + leaderboards (Cloudflare D1)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,          -- sha256 of the recovery code (the code itself is never stored)
  handle TEXT NOT NULL,
  bed INTEGER NOT NULL,
  state TEXT NOT NULL,          -- JSON: coins, own, eq, best, earned, coat
  earned INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS players_earned ON players(earned DESC);
CREATE INDEX IF NOT EXISTS players_handle ON players(handle);
CREATE TABLE IF NOT EXISTS scores (
  player TEXT NOT NULL,
  game TEXT NOT NULL,
  day TEXT NOT NULL,            -- YYYY-MM-DD (UTC)
  best INTEGER NOT NULL,
  PRIMARY KEY (player, game, day)
);
CREATE INDEX IF NOT EXISTS scores_game_day ON scores(game, day, best DESC);
CREATE TABLE IF NOT EXISTS daily (
  player TEXT NOT NULL,
  day TEXT NOT NULL,
  gained INTEGER NOT NULL DEFAULT 0,   -- coins earned that day (server-capped)
  writes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player, day)
);
