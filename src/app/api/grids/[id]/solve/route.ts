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

  const db = await getDb();
  const gridResult = await db.execute({
    sql: "SELECT * FROM grids WHERE id = ?",
    args: [gridId],
  });
  if (gridResult.rows.length === 0) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }
  const grid = gridResult.rows[0];

  const { answers } = await req.json();
  if (!Array.isArray(answers) || answers.length !== 9) {
    return NextResponse.json({ error: "Need exactly 9 answers" }, { status: 400 });
  }

  const rowCategories = JSON.parse(grid.row_categories as string) as string[];
  const colCategories = JSON.parse(grid.col_categories as string) as string[];

  // Check for duplicate Pokémon across cells
  const nonEmptyAnswers = answers.filter((a: string) => a);
  const uniqueAnswers = new Set(nonEmptyAnswers.map((a: string) => a.toLowerCase()));
  if (uniqueAnswers.size < nonEmptyAnswers.length) {
    return NextResponse.json({ error: "You cannot use the same Pokémon more than once" }, { status: 400 });
  }

  const isCorrect: boolean[] = Array(9).fill(false);
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
        isCorrect[idx] = true;
      }
    }
  }

  const exampleAnswers = JSON.parse(grid.example_answers as string) as string[];

  // Upsert play history
  const existing = await db.execute({
    sql: "SELECT id FROM play_history WHERE grid_id = ? AND player_id = ?",
    args: [gridId, session.user.id],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: "UPDATE play_history SET answers = ?, correct_count = ?, played_at = datetime('now') WHERE id = ?",
      args: [JSON.stringify(answers), correctCount, existing.rows[0].id as string],
    });
  } else {
    await db.execute({
      sql: "INSERT INTO play_history (id, grid_id, player_id, answers, correct_count) VALUES (?, ?, ?, ?, ?)",
      args: [generateId(), gridId, session.user.id, JSON.stringify(answers), correctCount],
    });
  }

  return NextResponse.json({ correctCount, exampleAnswers, isCorrect });
}
