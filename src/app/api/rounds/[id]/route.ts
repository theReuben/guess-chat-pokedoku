import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

// GET /api/rounds/:id - get round details with grids
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  // Get grids for this round
  let grids;
  if (round.status === "revealed") {
    // Show everything when revealed
    grids = db.prepare("SELECT * FROM grids WHERE round_id = ?").all(id);
  } else {
    // During play, hide who created each grid
    grids = db.prepare(`
      SELECT id, round_id, row_categories, col_categories, created_at
      FROM grids WHERE round_id = ?
    `).all(id);
  }

  // Get the user's solutions if they exist
  let userSolutions: unknown[] = [];
  if (userId) {
    userSolutions = db.prepare(`
      SELECT s.* FROM solutions s
      JOIN grids g ON g.id = s.grid_id
      WHERE g.round_id = ? AND s.player_id = ?
    `).all(id, userId);
  }

  // Get participants (people who submitted grids)
  const participants = db.prepare(`
    SELECT DISTINCT created_by as id, created_by_name as name
    FROM grids WHERE round_id = ?
  `).all(id);

  // Check if current user already submitted a grid
  const userGrid = userId
    ? db.prepare("SELECT id FROM grids WHERE round_id = ? AND created_by = ?").get(id, userId)
    : null;

  return NextResponse.json({
    ...round,
    grids,
    userSolutions,
    participants,
    hasSubmitted: !!userGrid,
  });
}

// PATCH /api/rounds/:id - update round status
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
  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  if (round.created_by !== session.user.id) {
    return NextResponse.json({ error: "Only the round creator can change status" }, { status: 403 });
  }

  const { status } = await req.json();
  const validTransitions: Record<string, string[]> = {
    submissions_open: ["playing"],
    playing: ["revealed"],
  };

  const currentStatus = round.status as string;
  if (!validTransitions[currentStatus]?.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${currentStatus} to ${status}` },
      { status: 400 }
    );
  }

  db.prepare("UPDATE rounds SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, id);

  const updated = db.prepare("SELECT * FROM rounds WHERE id = ?").get(id);
  return NextResponse.json(updated);
}
