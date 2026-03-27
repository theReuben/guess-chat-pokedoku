/**
 * Seeds the database with demo data for the new app structure.
 * Run with: npx tsx scripts/seed-demo.ts
 */

import { createClient } from "@libsql/client";
import { randomBytes } from "crypto";
import { pokemonMatchesCategory, findPokemon } from "../src/data/pokemon";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize tables
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
    grid_id TEXT NOT NULL REFERENCES grids(id) ON DELETE CASCADE,
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
    session_id TEXT NOT NULL REFERENCES guess_sessions(id) ON DELETE CASCADE,
    grid_id TEXT NOT NULL REFERENCES grids(id),
    answers TEXT NOT NULL,
    correct_count INTEGER NOT NULL DEFAULT 0,
    guessed_author_id TEXT,
    order_index INTEGER NOT NULL,
    UNIQUE(session_id, grid_id)
  );
`);

function id() { return randomBytes(8).toString("hex"); }

function validate(answers: string[], rows: string[], cols: string[]) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const p = findPokemon(answers[r * 3 + c]);
      if (!p) { console.error(`Not found: ${answers[r * 3 + c]}`); process.exit(1); }
      if (!pokemonMatchesCategory(p, rows[r]) || !pokemonMatchesCategory(p, cols[c])) {
        console.error(`${p.name} doesn't match row=${rows[r]} col=${cols[c]}`);
        process.exit(1);
      }
    }
  }
}

// --- Users ---
const users = [
  { id: "user-ash", discord_username: "ash_ketchum", display_name: "Ash" },
  { id: "user-misty", discord_username: "misty_waterflower", display_name: "Misty" },
  { id: "user-brock", discord_username: "brock_pewter", display_name: "Brock" },
  { id: "user-gary", discord_username: "gary_oak", display_name: "Gary" },
];

for (const u of users) {
  await db.execute({
    sql: "INSERT OR IGNORE INTO users (id, discord_username, display_name) VALUES (?, ?, ?)",
    args: [u.id, u.discord_username, u.display_name],
  });
}
console.log(`Created ${users.length} users`);

// --- Ash's grids ---
// Grid 1: Submission
const ashGrid1 = {
  id: id(),
  rows: ["type-fire", "type-water", "type-dragon"],
  cols: ["gen-1", "gen-3", "status-legendary"],
  answers: ["Charmander", "Torchic", "Moltres", "Squirtle", "Mudkip", "Palkia", "Dragonite", "Salamence", "Rayquaza"],
};
validate(ashGrid1.answers, ashGrid1.rows, ashGrid1.cols);
await db.execute({
  sql: "INSERT INTO grids (id, created_by, row_categories, col_categories, example_answers, is_submission) VALUES (?, ?, ?, ?, ?, 1)",
  args: [ashGrid1.id, "user-ash", JSON.stringify(ashGrid1.rows), JSON.stringify(ashGrid1.cols), JSON.stringify(ashGrid1.answers)],
});

// Grid 2: Non-submission (for All mode)
const ashGrid2 = {
  id: id(),
  rows: ["type-electric", "type-ice", "type-ground"],
  cols: ["gen-1", "gen-2", "gen-4"],
  answers: ["Pikachu", "Pichu", "Rotom", "Lapras", "Sneasel", "Weavile", "Geodude", "Larvitar", "Garchomp"],
};
validate(ashGrid2.answers, ashGrid2.rows, ashGrid2.cols);
await db.execute({
  sql: "INSERT INTO grids (id, created_by, row_categories, col_categories, example_answers, is_submission) VALUES (?, ?, ?, ?, ?, 0)",
  args: [ashGrid2.id, "user-ash", JSON.stringify(ashGrid2.rows), JSON.stringify(ashGrid2.cols), JSON.stringify(ashGrid2.answers)],
});
console.log("Created Ash's grids (1 submission, 1 regular)");

// --- Misty's grid (submission) ---
const mistyGrid = {
  id: id(),
  rows: ["type-fire", "type-grass", "type-psychic"],
  cols: ["gen-1", "gen-2", "gen-7"],
  answers: ["Charmander", "Cyndaquil", "Litten", "Bulbasaur", "Chikorita", "Rowlet", "Mew", "Espeon", "Solgaleo"],
};
validate(mistyGrid.answers, mistyGrid.rows, mistyGrid.cols);
await db.execute({
  sql: "INSERT INTO grids (id, created_by, row_categories, col_categories, example_answers, is_submission) VALUES (?, ?, ?, ?, ?, 1)",
  args: [mistyGrid.id, "user-misty", JSON.stringify(mistyGrid.rows), JSON.stringify(mistyGrid.cols), JSON.stringify(mistyGrid.answers)],
});
console.log("Created Misty's submission grid");

// --- Brock's grid (submission) ---
const brockGrid = {
  id: id(),
  rows: ["type-rock", "type-ground", "type-steel"],
  cols: ["gen-2", "gen-3", "gen-4"],
  answers: ["Larvitar", "Aron", "Cranidos", "Steelix", "Flygon", "Garchomp", "Scizor", "Metagross", "Lucario"],
};
validate(brockGrid.answers, brockGrid.rows, brockGrid.cols);
await db.execute({
  sql: "INSERT INTO grids (id, created_by, row_categories, col_categories, example_answers, is_submission) VALUES (?, ?, ?, ?, ?, 1)",
  args: [brockGrid.id, "user-brock", JSON.stringify(brockGrid.rows), JSON.stringify(brockGrid.cols), JSON.stringify(brockGrid.answers)],
});
console.log("Created Brock's submission grid");

// --- Gary's grid (non-submission, for All mode) ---
const garyGrid = {
  id: id(),
  rows: ["type-water", "type-fire", "type-grass"],
  cols: ["gen-3", "gen-4", "gen-6"],
  answers: ["Mudkip", "Piplup", "Froakie", "Torchic", "Chimchar", "Fennekin", "Treecko", "Turtwig", "Chespin"],
};
validate(garyGrid.answers, garyGrid.rows, garyGrid.cols);
await db.execute({
  sql: "INSERT INTO grids (id, created_by, row_categories, col_categories, example_answers, is_submission) VALUES (?, ?, ?, ?, ?, 0)",
  args: [garyGrid.id, "user-gary", JSON.stringify(garyGrid.rows), JSON.stringify(garyGrid.cols), JSON.stringify(garyGrid.answers)],
});
console.log("Created Gary's regular grid");

console.log(`\n✓ Demo data seeded!`);
console.log(`\nOpen http://localhost:3000 to see the app.`);
console.log(`\nTo test as a user, sign in via Discord OAuth.`);
console.log(`For local testing without OAuth, the demo users are: Ash, Misty, Brock, Gary`);
