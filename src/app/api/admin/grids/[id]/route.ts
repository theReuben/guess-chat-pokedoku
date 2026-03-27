import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import getDb from "@/lib/db";

// PATCH /api/admin/grids/:id - toggle submission, or edit grid
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin: admin } = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();

  const gridResult = await db.execute({
    sql: "SELECT * FROM grids WHERE id = ?",
    args: [id],
  });
  if (gridResult.rows.length === 0) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }
  const grid = gridResult.rows[0];

  const body = await req.json();

  if (typeof body.isSubmission === "boolean") {
    if (body.isSubmission) {
      // Unmark any existing submission by the same creator
      await db.execute({
        sql: "UPDATE grids SET is_submission = 0, updated_at = datetime('now') WHERE created_by = ?",
        args: [grid.created_by as string],
      });
    }
    await db.execute({
      sql: "UPDATE grids SET is_submission = ?, updated_at = datetime('now') WHERE id = ?",
      args: [body.isSubmission ? 1 : 0, id],
    });
  }

  const updated = await db.execute({
    sql: `SELECT g.*, u.display_name as creator_name, u.discord_username
    FROM grids g
    JOIN users u ON u.id = g.created_by
    WHERE g.id = ?`,
    args: [id],
  });

  return NextResponse.json(updated.rows[0]);
}

// DELETE /api/admin/grids/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin: admin } = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  await db.execute({ sql: "DELETE FROM grids WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
