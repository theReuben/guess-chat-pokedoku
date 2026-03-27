import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { generateId } from "@/lib/utils";
import { findPokemon, pokemonMatchesCategory } from "@/data/pokemon";

// GET /api/play/guess-chat - get or create the user's current guess session
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Find existing in-progress session
  let guessSession = db.prepare(
    "SELECT * FROM guess_sessions WHERE player_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1"
  ).get(session.user.id) as Record<string, unknown> | undefined;

  // Get all submission grids (not the player's own)
  const submissionGrids = db.prepare(`
    SELECT g.id, g.row_categories, g.col_categories, g.created_by
    FROM grids g
    WHERE g.is_submission = 1 AND g.created_by != ?
    ORDER BY RANDOM()
  `).all(session.user.id) as { id: string; row_categories: string; col_categories: string; created_by: string }[];

  if (submissionGrids.length === 0) {
    return NextResponse.json({ session: null, message: "No submissions available to play" });
  }

  // Create session if none exists
  if (!guessSession) {
    const sessionId = generateId();
    db.prepare(
      "INSERT INTO guess_sessions (id, player_id) VALUES (?, ?)"
    ).run(sessionId, session.user.id);
    guessSession = db.prepare("SELECT * FROM guess_sessions WHERE id = ?").get(sessionId) as Record<string, unknown>;
  }

  // Get existing entries for this session
  const entries = db.prepare(
    "SELECT * FROM guess_entries WHERE session_id = ? ORDER BY order_index"
  ).all(guessSession.id as string) as { grid_id: string; answers: string; guessed_author_id: string; order_index: number }[];

  const completedGridIds = new Set(entries.map(e => e.grid_id));

  // Find next unplayed grid
  const nextGrid = submissionGrids.find(g => !completedGridIds.has(g.id));

  // Get all users for the guess dropdown
  const users = db.prepare(
    "SELECT id, display_name, avatar_url FROM users ORDER BY display_name"
  ).all();

  return NextResponse.json({
    session: guessSession,
    entries,
    nextGrid: nextGrid ? { id: nextGrid.id, row_categories: nextGrid.row_categories, col_categories: nextGrid.col_categories } : null,
    totalGrids: submissionGrids.length,
    completedCount: completedGridIds.size,
    users,
  });
}

// POST /api/play/guess-chat - submit an entry (solve + guess author) for current session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const guessSession = db.prepare(
    "SELECT * FROM guess_sessions WHERE player_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1"
  ).get(session.user.id) as Record<string, unknown> | undefined;

  if (!guessSession) {
    return NextResponse.json({ error: "No active session" }, { status: 400 });
  }

  const { gridId, answers, guessedAuthorId } = await req.json();

  const grid = db.prepare("SELECT * FROM grids WHERE id = ?").get(gridId) as Record<string, unknown> | undefined;
  if (!grid) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }

  if (!Array.isArray(answers) || answers.length !== 9) {
    return NextResponse.json({ error: "Need exactly 9 answers" }, { status: 400 });
  }

  // Score
  const rowCategories = JSON.parse(grid.row_categories as string) as string[];
  const colCategories = JSON.parse(grid.col_categories as string) as string[];
  let correctCount = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const pokemon = answers[idx] ? findPokemon(answers[idx]) : null;
      if (pokemon &&
          pokemonMatchesCategory(pokemon, rowCategories[row]) &&
          pokemonMatchesCategory(pokemon, colCategories[col])) {
        correctCount++;
      }
    }
  }

  // Get current entry count for order_index
  const entryCount = db.prepare(
    "SELECT COUNT(*) as count FROM guess_entries WHERE session_id = ?"
  ).get(guessSession.id as string) as { count: number };

  // Check if already exists (update case)
  const existing = db.prepare(
    "SELECT id FROM guess_entries WHERE session_id = ? AND grid_id = ?"
  ).get(guessSession.id as string, gridId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE guess_entries SET answers = ?, correct_count = ?, guessed_author_id = ? WHERE id = ?"
    ).run(JSON.stringify(answers), correctCount, guessedAuthorId || null, existing.id);
  } else {
    db.prepare(
      "INSERT INTO guess_entries (id, session_id, grid_id, answers, correct_count, guessed_author_id, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(generateId(), guessSession.id, gridId, JSON.stringify(answers), correctCount, guessedAuthorId || null, entryCount.count);
  }

  return NextResponse.json({ correctCount });
}
