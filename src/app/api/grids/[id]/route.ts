import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { findPokemon, pokemonMatchesCategory, CATEGORIES } from "@/data/pokemon";

// GET /api/grids/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM grids WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

// PATCH /api/grids/:id - update grid (edit categories/answers, toggle submission)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const gridResult = await db.execute({
    sql: "SELECT * FROM grids WHERE id = ?",
    args: [id],
  });
  if (gridResult.rows.length === 0) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }
  const grid = gridResult.rows[0];
  if (grid.created_by !== session.user.id) {
    return NextResponse.json({ error: "Not your grid" }, { status: 403 });
  }

  const body = await req.json();

  // Toggle submission status
  if (typeof body.isSubmission === "boolean") {
    if (body.isSubmission) {
      // Unmark any existing submission first
      await db.execute({
        sql: "UPDATE grids SET is_submission = 0, updated_at = datetime('now') WHERE created_by = ?",
        args: [session.user.id],
      });
    }
    await db.execute({
      sql: "UPDATE grids SET is_submission = ?, updated_at = datetime('now') WHERE id = ?",
      args: [body.isSubmission ? 1 : 0, id],
    });
  }

  // Update categories and answers
  if (body.rowCategories && body.colCategories && body.exampleAnswers) {
    const { rowCategories, colCategories, exampleAnswers } = body;

    // Validate
    if (!Array.isArray(rowCategories) || rowCategories.length !== 3 ||
        !Array.isArray(colCategories) || colCategories.length !== 3) {
      return NextResponse.json({ error: "Need exactly 3 row and 3 column categories" }, { status: 400 });
    }

    const allCategoryIds = CATEGORIES.map(c => c.id);
    const allSelected = [...rowCategories, ...colCategories];
    if (allSelected.some((cid: string) => !allCategoryIds.includes(cid))) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    if (!Array.isArray(exampleAnswers) || exampleAnswers.length !== 9) {
      return NextResponse.json({ error: "Need exactly 9 answers" }, { status: 400 });
    }

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const pokemon = findPokemon(exampleAnswers[idx]);
        if (!pokemon) {
          return NextResponse.json({ error: `"${exampleAnswers[idx]}" is not recognized` }, { status: 400 });
        }
        if (!pokemonMatchesCategory(pokemon, rowCategories[row]) ||
            !pokemonMatchesCategory(pokemon, colCategories[col])) {
          return NextResponse.json({ error: `${pokemon.name} doesn't match categories` }, { status: 400 });
        }
      }
    }

    await db.execute({
      sql: "UPDATE grids SET row_categories = ?, col_categories = ?, example_answers = ?, updated_at = datetime('now') WHERE id = ?",
      args: [JSON.stringify(rowCategories), JSON.stringify(colCategories), JSON.stringify(exampleAnswers), id],
    });
  }

  const updated = await db.execute({
    sql: "SELECT * FROM grids WHERE id = ?",
    args: [id],
  });
  return NextResponse.json(updated.rows[0]);
}

// DELETE /api/grids/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const gridResult = await db.execute({
    sql: "SELECT * FROM grids WHERE id = ?",
    args: [id],
  });
  if (gridResult.rows.length === 0) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }
  if (gridResult.rows[0].created_by !== session.user.id) {
    return NextResponse.json({ error: "Not your grid" }, { status: 403 });
  }

  await db.execute({ sql: "DELETE FROM grids WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
