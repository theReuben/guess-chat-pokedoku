import { createClient, type Client } from "@libsql/client";

let db: Client;

export function getDb(): Client {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    // Initialize tables on first use
    initializeDb(db);
  }
  return db;
}

async function initializeDb(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      discord_username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grids (
      id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL REFERENCES users(id),
      row_categories TEXT NOT NULL,
      col_categories TEXT NOT NULL,
      example_answers TEXT NOT NULL,
      is_submission INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS play_history (
      id TEXT PRIMARY KEY,
      grid_id TEXT NOT NULL REFERENCES grids(id),
      player_id TEXT NOT NULL REFERENCES users(id),
      answers TEXT NOT NULL,
      correct_count INTEGER NOT NULL DEFAULT 0,
      played_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(grid_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS guess_sessions (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      submitted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS guess_entries (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES guess_sessions(id),
      grid_id TEXT NOT NULL REFERENCES grids(id),
      answers TEXT NOT NULL,
      correct_count INTEGER NOT NULL DEFAULT 0,
      guessed_author_id TEXT,
      order_index INTEGER NOT NULL,
      UNIQUE(session_id, grid_id)
    );
  `);
}

export default getDb;
