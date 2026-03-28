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
  let guessSessionResult = await db.execute({
    sql: "SELECT * FROM guess_sessions WHERE player_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1",
    args: [session.user.id],
  });

  // Get all submission grids (not the player's own)
  const submissionGridsResult = await db.execute({
    sql: `SELECT g.id, g.row_categories, g.col_categories, g.created_by
    FROM grids g
    WHERE g.is_submission = 1 AND g.created_by != ?
    ORDER BY RANDOM()`,
    args: [session.user.id],
  });

  if (submissionGridsResult.rows.length === 0) {
    return NextResponse.json({ session: null, message: "No submissions available to play" });
  }

  // Create session if none exists
  let guessSession = guessSessionResult.rows[0];
  if (!guessSession) {
    const sessionId = generateId();
    await db.execute({
      sql: "INSERT INTO guess_sessions (id, player_id) VALUES (?, ?)",
      args: [sessionId, session.user.id],
    });
    const newSession = await db.execute({
      sql: "SELECT * FROM guess_sessions WHERE id = ?",
      args: [sessionId],
    });
    guessSession = newSession.rows[0];
  }

  // Get existing entries for this session
  const entriesResult = await db.execute({
    sql: "SELECT * FROM guess_entries WHERE session_id = ? ORDER BY order_index",
    args: [guessSession.id as string],
  });

  // Only count entries for grids that are still current submissions
  // (guards against stale entries when a grid is un-marked then re-marked as submission)
  const submissionGridIdSet = new Set(submissionGridsResult.rows.map(g => g.id as string));
  const completedGridIds = new Set(
    entriesResult.rows
      .map(e => e.grid_id as string)
      .filter(id => submissionGridIdSet.has(id))
  );

  // Find next unplayed grid
  const nextGrid = submissionGridsResult.rows.find(g => !completedGridIds.has(g.id as string));

  // Get all users for the guess dropdown
  const usersResult = await db.execute(
    "SELECT id, display_name, avatar_url FROM users ORDER BY display_name"
  );

  return NextResponse.json({
    session: guessSession,
    entries: entriesResult.rows,
    nextGrid: nextGrid ? { id: nextGrid.id, row_categories: nextGrid.row_categories, col_categories: nextGrid.col_categories } : null,
    totalGrids: submissionGridsResult.rows.length,
    completedCount: completedGridIds.size,
    users: usersResult.rows,
  });
}

// POST /api/play/guess-chat - submit an entry (solve + guess author) for current session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const guessSessionResult = await db.execute({
    sql: "SELECT * FROM guess_sessions WHERE player_id = ? AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1",
    args: [session.user.id],
  });

  if (guessSessionResult.rows.length === 0) {
    return NextResponse.json({ error: "No active session" }, { status: 400 });
  }
  const guessSession = guessSessionResult.rows[0];

  const { gridId, answers, guessedAuthorId } = await req.json();

  const gridResult = await db.execute({
    sql: "SELECT * FROM grids WHERE id = ?",
    args: [gridId],
  });
  if (gridResult.rows.length === 0) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }
  const grid = gridResult.rows[0];

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
  const entryCountResult = await db.execute({
    sql: "SELECT COUNT(*) as count FROM guess_entries WHERE session_id = ?",
    args: [guessSession.id as string],
  });
  const entryCount = entryCountResult.rows[0].count as number;

  // Check if already exists (update case)
  const existingResult = await db.execute({
    sql: "SELECT id FROM guess_entries WHERE session_id = ? AND grid_id = ?",
    args: [guessSession.id as string, gridId],
  });

  if (existingResult.rows.length > 0) {
    await db.execute({
      sql: "UPDATE guess_entries SET answers = ?, correct_count = ?, guessed_author_id = ? WHERE id = ?",
      args: [JSON.stringify(answers), correctCount, guessedAuthorId || null, existingResult.rows[0].id as string],
    });
  } else {
    await db.execute({
      sql: "INSERT INTO guess_entries (id, session_id, grid_id, answers, correct_count, guessed_author_id, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [generateId(), guessSession.id as string, gridId, JSON.stringify(answers), correctCount, guessedAuthorId || null, entryCount],
    });
  }

  return NextResponse.json({ correctCount });
}
