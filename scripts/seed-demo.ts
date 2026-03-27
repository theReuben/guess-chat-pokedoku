/**
 * Seeds the database with demo data to showcase the full game flow.
 * Run with: npx tsx scripts/seed-demo.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";
import { CATEGORIES, pokemonMatchesCategory, findPokemon } from "../src/data/pokemon";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "pokedoku.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submissions_open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS grids (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES rounds(id),
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    row_categories TEXT NOT NULL,
    col_categories TEXT NOT NULL,
    answers TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS solutions (
    id TEXT PRIMARY KEY,
    grid_id TEXT NOT NULL REFERENCES grids(id),
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    answers TEXT NOT NULL,
    correct_count INTEGER NOT NULL DEFAULT 0,
    guessed_author_id TEXT,
    guessed_author_name TEXT,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(grid_id, player_id)
  );
`);

function id() {
  return randomBytes(8).toString("hex");
}

// --- Fake players ---
const players = [
  { id: "player-ash", name: "Ash" },
  { id: "player-misty", name: "Misty" },
  { id: "player-brock", name: "Brock" },
];

// --- Create a round ---
const roundId = id();
db.prepare("INSERT INTO rounds (id, name, created_by, status) VALUES (?, ?, ?, ?)")
  .run(roundId, "Friday Night Pokédoku", players[0].id, "revealed");
console.log(`Created round: ${roundId}`);

// --- Grid 1: Ash's grid ---
const grid1Id = id();
const grid1Rows = ["type-fire", "type-water", "type-dragon"];
const grid1Cols = ["gen-1", "gen-3", "status-legendary"];
const grid1Answers = [
  "Charmander",  // Fire + Gen 1
  "Torchic",     // Fire + Gen 3
  "Moltres",     // Fire + Legendary
  "Squirtle",    // Water + Gen 1
  "Mudkip",      // Water + Gen 3
  "Palkia",      // Water + Legendary (Gen 4, but matches Water+Legendary)
  "Dragonite",   // Dragon + Gen 1
  "Salamence",   // Dragon + Gen 3
  "Rayquaza",    // Dragon + Legendary
];

// Validate
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    const p = findPokemon(grid1Answers[r * 3 + c]);
    if (!p) {
      console.error(`Not found: ${grid1Answers[r * 3 + c]}`);
      process.exit(1);
    }
    const matchRow = pokemonMatchesCategory(p, grid1Rows[r]);
    const matchCol = pokemonMatchesCategory(p, grid1Cols[c]);
    if (!matchRow || !matchCol) {
      console.error(`${p.name} doesn't match: row=${grid1Rows[r]}(${matchRow}) col=${grid1Cols[c]}(${matchCol})`);
      process.exit(1);
    }
  }
}

db.prepare("INSERT INTO grids (id, round_id, created_by, created_by_name, row_categories, col_categories, answers) VALUES (?, ?, ?, ?, ?, ?, ?)")
  .run(grid1Id, roundId, players[0].id, players[0].name, JSON.stringify(grid1Rows), JSON.stringify(grid1Cols), JSON.stringify(grid1Answers));
console.log(`Created Ash's grid: ${grid1Id}`);

// --- Grid 2: Misty's grid ---
const grid2Id = id();
const grid2Rows = ["type-psychic", "type-ghost", "type-steel"];
const grid2Cols = ["gen-1", "gen-4", "evo-trade"];
const grid2Answers = [
  "Alakazam",    // Psychic + Gen 1
  "Espeon",      // Psychic + Gen 2... wait, need Gen 4
  "Alakazam",    // let me recalculate
];

// Let me pick valid answers more carefully
const grid2AnswersFinal = [
  "Mew",         // Psychic + Gen 1
  "Gallade",     // Psychic + Gen 4
  "Alakazam",    // Psychic + Trade
  "Gengar",      // Ghost + Gen 1
  "Rotom",       // Ghost + Gen 4
  "Gengar",      // Ghost + Trade — wait, can't repeat
];

// Actually let me just use a simpler grid
const grid2RowsFinal = ["type-ice", "type-dark", "type-fairy"];
const grid2ColsFinal = ["gen-1", "gen-2", "gen-4"];
const grid2AnswersFinal2 = [
  "Lapras",      // Ice + Gen 1
  "Sneasel",     // Ice + Gen 2
  "Weavile",     // Ice + Gen 4
  "Sneasel",     // ... hmm duplicates
];

// Simpler approach: use well-known combos
const g2Rows = ["type-fire", "type-grass", "type-psychic"];
const g2Cols = ["gen-1", "gen-2", "gen-7"];
const g2Answers = [
  "Charmander",   // Fire + Gen 1
  "Cyndaquil",    // Fire + Gen 2
  "Litten",       // Fire + Gen 7
  "Bulbasaur",    // Grass + Gen 1
  "Chikorita",    // Grass + Gen 2
  "Rowlet",       // Grass + Gen 7... Rowlet is Grass/Flying Gen 7
  "Mew",          // Psychic + Gen 1
  "Espeon",       // Psychic + Gen 2
  "Solgaleo",     // Psychic + Gen 7
];

// Validate
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    const p = findPokemon(g2Answers[r * 3 + c]);
    if (!p) {
      console.error(`Not found: ${g2Answers[r * 3 + c]}`);
      process.exit(1);
    }
    const matchRow = pokemonMatchesCategory(p, g2Rows[r]);
    const matchCol = pokemonMatchesCategory(p, g2Cols[c]);
    if (!matchRow || !matchCol) {
      console.error(`${p.name} doesn't match: row=${g2Rows[r]}(${matchRow}) col=${g2Cols[c]}(${matchCol})`);
      process.exit(1);
    }
  }
}

db.prepare("INSERT INTO grids (id, round_id, created_by, created_by_name, row_categories, col_categories, answers) VALUES (?, ?, ?, ?, ?, ?, ?)")
  .run(grid2Id, roundId, players[1].id, players[1].name, JSON.stringify(g2Rows), JSON.stringify(g2Cols), JSON.stringify(g2Answers));
console.log(`Created Misty's grid: ${grid2Id}`);

// --- Brock solves Ash's grid ---
const bSolvesAsh = [
  "Charizard",   // Fire + Gen 1 ✓ (different answer but valid)
  "Torchic",     // Fire + Gen 3 ✓
  "Ho-Oh",       // Fire + Legendary ✓
  "Squirtle",    // Water + Gen 1 ✓
  "Feebas",      // Water + Gen 3 ✓
  "Palkia",      // Water + Legendary ✓
  "Dragonite",   // Dragon + Gen 1 ✓
  "Bagon",       // Dragon + Gen 3 ✓
  "Rayquaza",    // Dragon + Legendary ✓
];

let correctCount = 0;
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    const p = findPokemon(bSolvesAsh[r * 3 + c]);
    if (p && pokemonMatchesCategory(p, grid1Rows[r]) && pokemonMatchesCategory(p, grid1Cols[c])) {
      correctCount++;
    }
  }
}

db.prepare("INSERT INTO solutions (id, grid_id, player_id, player_name, answers, correct_count, guessed_author_id, guessed_author_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
  .run(id(), grid1Id, players[2].id, players[2].name, JSON.stringify(bSolvesAsh), correctCount, players[1].id, players[1].name);
console.log(`Brock solved Ash's grid: ${correctCount}/9 (guessed Misty — wrong!)`);

// --- Brock solves Misty's grid ---
const bSolvesMisty = [
  "Charmander",  // Fire + Gen 1 ✓
  "Cyndaquil",   // Fire + Gen 2 ✓
  "Litten",      // Fire + Gen 7 ✓
  "Bulbasaur",   // Grass + Gen 1 ✓
  "Chikorita",   // Grass + Gen 2 ✓
  "Rowlet",      // Grass + Gen 7 ✓
  "Alakazam",    // Psychic + Gen 1 ✓
  "Espeon",      // Psychic + Gen 2 ✓
  "Lunala",      // Psychic + Gen 7 ✓
];

let correctCount2 = 0;
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    const p = findPokemon(bSolvesMisty[r * 3 + c]);
    if (p && pokemonMatchesCategory(p, g2Rows[r]) && pokemonMatchesCategory(p, g2Cols[c])) {
      correctCount2++;
    }
  }
}

db.prepare("INSERT INTO solutions (id, grid_id, player_id, player_name, answers, correct_count, guessed_author_id, guessed_author_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
  .run(id(), grid2Id, players[2].id, players[2].name, JSON.stringify(bSolvesMisty), correctCount2, players[1].id, players[1].name);
console.log(`Brock solved Misty's grid: ${correctCount2}/9 (guessed Misty — correct!)`);

console.log(`\n✓ Demo data seeded!`);
console.log(`\nOpen http://localhost:3000 to see the round.`);
console.log(`Round page: http://localhost:3000/rounds/${roundId}`);
console.log(`Ash's grid results: http://localhost:3000/results/${grid1Id}`);
console.log(`Misty's grid results: http://localhost:3000/results/${grid2Id}`);

db.close();
