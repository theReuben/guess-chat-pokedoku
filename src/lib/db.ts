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
    -- Rounds group multiple grids together for a session
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submissions_open',
      -- status: submissions_open | playing | revealed
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Grids submitted by players
    CREATE TABLE IF NOT EXISTS grids (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL REFERENCES rounds(id),
      created_by TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      -- 3 row category IDs and 3 column category IDs
      row_categories TEXT NOT NULL, -- JSON array of 3 category IDs
      col_categories TEXT NOT NULL, -- JSON array of 3 category IDs
      -- The creator's intended answers (9 Pokémon names as JSON array)
      answers TEXT NOT NULL, -- JSON array of 9 pokemon names (row-major)
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Solutions: a player's attempt at solving a grid
    CREATE TABLE IF NOT EXISTS solutions (
      id TEXT PRIMARY KEY,
      grid_id TEXT NOT NULL REFERENCES grids(id),
      player_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      -- The player's answers (9 Pokémon names as JSON array, null for unanswered)
      answers TEXT NOT NULL, -- JSON array of 9 pokemon names or nulls
      -- How many cells were correctly filled (valid pokemon matching both categories)
      correct_count INTEGER NOT NULL DEFAULT 0,
      -- Who does the player think created this grid?
      guessed_author_id TEXT,
      guessed_author_name TEXT,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(grid_id, player_id)
    );
  `);
}

export default getDb;
