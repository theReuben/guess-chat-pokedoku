import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "pokedoku.db");

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    -- Users with custom display names
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,           -- Discord user ID
      discord_username TEXT NOT NULL,
      display_name TEXT NOT NULL,     -- Editable in-game name
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Grids created by users
    CREATE TABLE IF NOT EXISTS grids (
      id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL REFERENCES users(id),
      row_categories TEXT NOT NULL,   -- JSON array of 3 category IDs
      col_categories TEXT NOT NULL,   -- JSON array of 3 category IDs
      example_answers TEXT NOT NULL,  -- JSON array of 9 pokemon names (creator's solution)
      is_submission INTEGER NOT NULL DEFAULT 0,  -- 1 if this is the user's chosen submission
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Play history for All mode (tracks what a user has already played)
    CREATE TABLE IF NOT EXISTS play_history (
      id TEXT PRIMARY KEY,
      grid_id TEXT NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL REFERENCES users(id),
      answers TEXT NOT NULL,          -- JSON array of 9 pokemon names
      correct_count INTEGER NOT NULL DEFAULT 0,
      played_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(grid_id, player_id)
    );

    -- Guess Chat sessions
    CREATE TABLE IF NOT EXISTS guess_sessions (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress | submitted
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      submitted_at TEXT
    );

    -- Individual guesses within a Guess Chat session
    CREATE TABLE IF NOT EXISTS guess_entries (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES guess_sessions(id) ON DELETE CASCADE,
      grid_id TEXT NOT NULL REFERENCES grids(id),
      answers TEXT NOT NULL,          -- JSON array of 9 pokemon names
      correct_count INTEGER NOT NULL DEFAULT 0,
      guessed_author_id TEXT,         -- Who the player thinks created it
      order_index INTEGER NOT NULL,   -- Order the player solved them
      UNIQUE(session_id, grid_id)
    );
  `);
}

export default getDb;
