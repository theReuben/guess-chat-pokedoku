import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { generateId } from "@/lib/utils";
import { findPokemon, pokemonMatchesCategory, CATEGORIES } from "@/data/pokemon";

// POST /api/grids - submit a new grid
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roundId, rowCategories, colCategories, answers } = await req.json();

  // Validate round exists and is accepting submissions
  const db = getDb();
  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(roundId) as Record<string, unknown> | undefined;
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }
  if (round.status !== "submissions_open") {
    return NextResponse.json({ error: "Round is not accepting submissions" }, { status: 400 });
  }

  // Check if user already submitted
  const existing = db.prepare(
    "SELECT id FROM grids WHERE round_id = ? AND created_by = ?"
  ).get(roundId, session.user.id);
  if (existing) {
    return NextResponse.json({ error: "You already submitted a grid for this round" }, { status: 400 });
  }

  // Validate categories
  if (!Array.isArray(rowCategories) || rowCategories.length !== 3 ||
      !Array.isArray(colCategories) || colCategories.length !== 3) {
    return NextResponse.json({ error: "Need exactly 3 row and 3 column categories" }, { status: 400 });
  }

  const allCategoryIds = CATEGORIES.map(c => c.id);
  const allSelected = [...rowCategories, ...colCategories];
  if (allSelected.some(id => !allCategoryIds.includes(id))) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }
  if (new Set(allSelected).size !== 6) {
    return NextResponse.json({ error: "All categories must be unique" }, { status: 400 });
  }

  // Validate answers (9 Pokémon, one per cell)
  if (!Array.isArray(answers) || answers.length !== 9) {
    return NextResponse.json({ error: "Need exactly 9 answers" }, { status: 400 });
  }

  // Validate each answer matches its row and column category
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const pokemonName = answers[idx];
      const pokemon = findPokemon(pokemonName);
      if (!pokemon) {
        return NextResponse.json(
          { error: `"${pokemonName}" is not a recognized Pokémon` },
          { status: 400 }
        );
      }
      if (!pokemonMatchesCategory(pokemon, rowCategories[row])) {
        return NextResponse.json(
          { error: `${pokemon.name} doesn't match row category` },
          { status: 400 }
        );
      }
      if (!pokemonMatchesCategory(pokemon, colCategories[col])) {
        return NextResponse.json(
          { error: `${pokemon.name} doesn't match column category` },
          { status: 400 }
        );
      }
    }
  }

  const id = generateId();
  db.prepare(`
    INSERT INTO grids (id, round_id, created_by, created_by_name, row_categories, col_categories, answers)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    roundId,
    session.user.id,
    session.user.name || "Unknown",
    JSON.stringify(rowCategories),
    JSON.stringify(colCategories),
    JSON.stringify(answers)
  );

  return NextResponse.json({ id }, { status: 201 });
}
