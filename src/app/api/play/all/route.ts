import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

// GET /api/play/all - get a random unplayed grid (non-submissions, not own)
// ?replay=true - get a random previously-played grid instead
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const replay = searchParams.get("replay") === "true";

  const db = getDb();

  if (replay) {
    // Get a random grid the user HAS already played, excluding their own and submissions
    const result = await db.execute({
      sql: `SELECT g.id, g.row_categories, g.col_categories, g.created_by,
             u.display_name as creator_name, u.avatar_url as creator_avatar
      FROM grids g
      JOIN users u ON u.id = g.created_by
      WHERE g.created_by != ?
        AND g.is_submission = 0
        AND EXISTS (
          SELECT 1 FROM play_history ph WHERE ph.grid_id = g.id AND ph.player_id = ?
        )
      ORDER BY RANDOM()
      LIMIT 1`,
      args: [session.user.id, session.user.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ grid: null, message: "No old grids found!" });
    }

    return NextResponse.json({ grid: result.rows[0] });
  }

  // Get a random grid the user hasn't played yet, excluding their own and submissions
  const result = await db.execute({
    sql: `SELECT g.id, g.row_categories, g.col_categories, g.created_by,
           u.display_name as creator_name, u.avatar_url as creator_avatar
    FROM grids g
    JOIN users u ON u.id = g.created_by
    WHERE g.created_by != ?
      AND g.is_submission = 0
      AND NOT EXISTS (
        SELECT 1 FROM play_history ph WHERE ph.grid_id = g.id AND ph.player_id = ?
      )
    ORDER BY RANDOM()
    LIMIT 1`,
    args: [session.user.id, session.user.id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ grid: null, message: "No more grids to play!" });
  }

  return NextResponse.json({ grid: result.rows[0] });
}
