import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { generateId } from "@/lib/utils";
import { findPokemon, pokemonMatchesCategory } from "@/data/pokemon";

// POST /api/grids/:id/solve - record a play result (All mode)
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

  const { answers } = await req.json();
  if (!Array.isArray(answers) || answers.length !== 9) {
    return NextResponse.json({ error: "Need exactly 9 answers" }, { status: 400 });
  }

  const rowCategories = JSON.parse(grid.row_categories as string) as string[];
  const colCategories = JSON.parse(grid.col_categories as string) as string[];

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

  // Upsert play history
  const existing = db.prepare(
    "SELECT id FROM play_history WHERE grid_id = ? AND player_id = ?"
  ).get(gridId, session.user.id) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE play_history SET answers = ?, correct_count = ?, played_at = datetime('now') WHERE id = ?"
    ).run(JSON.stringify(answers), correctCount, existing.id);
  } else {
    db.prepare(
      "INSERT INTO play_history (id, grid_id, player_id, answers, correct_count) VALUES (?, ?, ?, ?, ?)"
    ).run(generateId(), gridId, session.user.id, JSON.stringify(answers), correctCount);
  }

  return NextResponse.json({ correctCount });
}
