import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

// GET /api/grids/:id - get grid for playing (hides author) or results (shows everything)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const db = getDb();
  const grid = db.prepare("SELECT * FROM grids WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!grid) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }

  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(grid.round_id as string) as Record<string, unknown> | undefined;
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  // Get participants for author guessing
  const participants = db.prepare(`
    SELECT DISTINCT created_by as id, created_by_name as name
    FROM grids WHERE round_id = ?
  `).all(grid.round_id as string);

  // During playing, hide creator info and answers
  const safeGrid = round.status === "revealed"
    ? grid
    : {
        id: grid.id,
        round_id: grid.round_id,
        row_categories: grid.row_categories,
        col_categories: grid.col_categories,
      };

  // Get solutions for this grid (for results page)
  let solutions: unknown[] = [];
  if (round.status === "revealed") {
    solutions = db.prepare("SELECT * FROM solutions WHERE grid_id = ?").all(id);
  }

  // Check if current user already solved
  let userSolution = null;
  if (session?.user?.id) {
    userSolution = db.prepare(
      "SELECT * FROM solutions WHERE grid_id = ? AND player_id = ?"
    ).get(id, session.user.id);
  }

  return NextResponse.json({
    grid: safeGrid,
    round: { id: round.id, status: round.status, name: round.name },
    participants,
    solutions,
    userSolution,
  });
}
