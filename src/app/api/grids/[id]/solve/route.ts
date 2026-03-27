import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { generateId } from "@/lib/utils";
import { findPokemon, pokemonMatchesCategory } from "@/data/pokemon";

// POST /api/grids/:id/solve - submit a solution for a grid
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gridId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const grid = db.prepare("SELECT * FROM grids WHERE id = ?").get(gridId) as Record<string, unknown> | undefined;
  if (!grid) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }

  // Check round is in playing status
  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(grid.round_id as string) as Record<string, unknown> | undefined;
  if (!round || round.status !== "playing") {
    return NextResponse.json({ error: "Round is not in playing state" }, { status: 400 });
  }

  // Can't solve your own grid
  if (grid.created_by === session.user.id) {
    return NextResponse.json({ error: "You can't solve your own grid" }, { status: 400 });
  }

  // Check if already solved
  const existing = db.prepare(
    "SELECT id FROM solutions WHERE grid_id = ? AND player_id = ?"
  ).get(gridId, session.user.id);
  if (existing) {
    return NextResponse.json({ error: "You already submitted a solution" }, { status: 400 });
  }

  const { answers, guessedAuthorId, guessedAuthorName } = await req.json();

  if (!Array.isArray(answers) || answers.length !== 9) {
    return NextResponse.json({ error: "Need exactly 9 answers" }, { status: 400 });
  }

  const rowCategories = JSON.parse(grid.row_categories as string) as string[];
  const colCategories = JSON.parse(grid.col_categories as string) as string[];

  // Score the answers
  let correctCount = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const pokemonName = answers[idx];
      if (!pokemonName) continue;

      const pokemon = findPokemon(pokemonName);
      if (pokemon &&
          pokemonMatchesCategory(pokemon, rowCategories[row]) &&
          pokemonMatchesCategory(pokemon, colCategories[col])) {
        correctCount++;
      }
    }
  }

  const id = generateId();
  db.prepare(`
    INSERT INTO solutions (id, grid_id, player_id, player_name, answers, correct_count, guessed_author_id, guessed_author_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    gridId,
    session.user.id,
    session.user.name || "Unknown",
    JSON.stringify(answers),
    correctCount,
    guessedAuthorId || null,
    guessedAuthorName || null
  );

  return NextResponse.json({ id, correctCount }, { status: 201 });
}
