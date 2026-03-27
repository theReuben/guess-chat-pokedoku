import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

// PATCH /api/play/guess-chat/:sessionId - update guess for an entry or submit session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const guessSession = db.prepare(
    "SELECT * FROM guess_sessions WHERE id = ? AND player_id = ?"
  ).get(sessionId, session.user.id) as Record<string, unknown> | undefined;

  if (!guessSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await req.json();

  // Submit the entire session
  if (body.action === "submit") {
    if (guessSession.status === "submitted") {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    db.prepare(
      "UPDATE guess_sessions SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?"
    ).run(sessionId);

    return NextResponse.json({ ok: true });
  }

  // Update a specific entry's guess
  if (body.gridId && body.guessedAuthorId !== undefined) {
    if (guessSession.status === "submitted") {
      return NextResponse.json({ error: "Session already submitted" }, { status: 400 });
    }

    db.prepare(
      "UPDATE guess_entries SET guessed_author_id = ? WHERE session_id = ? AND grid_id = ?"
    ).run(body.guessedAuthorId || null, sessionId, body.gridId);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET /api/play/guess-chat/:sessionId - get session results (after submission)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const guessSession = db.prepare(
    "SELECT * FROM guess_sessions WHERE id = ? AND player_id = ?"
  ).get(sessionId, session.user.id) as Record<string, unknown> | undefined;

  if (!guessSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Get entries with grid + author info
  const entries = db.prepare(`
    SELECT ge.*, g.row_categories, g.col_categories, g.example_answers, g.created_by,
           u.display_name as actual_author_name, u.avatar_url as actual_author_avatar,
           gu.display_name as guessed_author_name
    FROM guess_entries ge
    JOIN grids g ON g.id = ge.grid_id
    JOIN users u ON u.id = g.created_by
    LEFT JOIN users gu ON gu.id = ge.guessed_author_id
    WHERE ge.session_id = ?
    ORDER BY ge.order_index
  `).all(sessionId);

  return NextResponse.json({
    session: guessSession,
    entries,
  });
}
