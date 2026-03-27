import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { generateId } from "@/lib/utils";
import { findPokemon, pokemonMatchesCategory, CATEGORIES } from "@/data/pokemon";

// GET /api/grids - list current user's grids
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM grids WHERE created_by = ? ORDER BY created_at DESC",
    args: [session.user.id],
  });

  return NextResponse.json(result.rows);
}

// POST /api/grids - create a new grid
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rowCategories, colCategories, exampleAnswers } = await req.json();

  // Validate categories
  if (!Array.isArray(rowCategories) || rowCategories.length !== 3 ||
      !Array.isArray(colCategories) || colCategories.length !== 3) {
    return NextResponse.json({ error: "Need exactly 3 row and 3 column categories" }, { status: 400 });
  }

  const allCategoryIds = CATEGORIES.map(c => c.id);
  const allSelected = [...rowCategories, ...colCategories];
  if (allSelected.some((id: string) => !allCategoryIds.includes(id))) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }
  if (new Set(allSelected).size !== 6) {
    return NextResponse.json({ error: "All categories must be unique" }, { status: 400 });
  }

  // Validate example answers
  if (!Array.isArray(exampleAnswers) || exampleAnswers.length !== 9) {
    return NextResponse.json({ error: "Need exactly 9 example answers" }, { status: 400 });
  }

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const pokemonName = exampleAnswers[idx];
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
  const db = getDb();
  await db.execute({
    sql: "INSERT INTO grids (id, created_by, row_categories, col_categories, example_answers) VALUES (?, ?, ?, ?, ?)",
    args: [id, session.user.id, JSON.stringify(rowCategories), JSON.stringify(colCategories), JSON.stringify(exampleAnswers)],
  });

  const result = await db.execute({
    sql: "SELECT * FROM grids WHERE id = ?",
    args: [id],
  });
  return NextResponse.json(result.rows[0], { status: 201 });
}
