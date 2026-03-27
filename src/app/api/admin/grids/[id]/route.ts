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

  const grid = db.prepare("SELECT * FROM grids WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!grid) {
    return NextResponse.json({ error: "Grid not found" }, { status: 404 });
  }

  const body = await req.json();

  if (typeof body.isSubmission === "boolean") {
    if (body.isSubmission) {
      // Unmark any existing submission by the same creator
      db.prepare("UPDATE grids SET is_submission = 0, updated_at = datetime('now') WHERE created_by = ?")
        .run(grid.created_by);
    }
    db.prepare("UPDATE grids SET is_submission = ?, updated_at = datetime('now') WHERE id = ?")
      .run(body.isSubmission ? 1 : 0, id);
  }

  const updated = db.prepare(`
    SELECT g.*, u.display_name as creator_name, u.discord_username
    FROM grids g
    JOIN users u ON u.id = g.created_by
    WHERE g.id = ?
  `).get(id);

  return NextResponse.json(updated);
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
  db.prepare("DELETE FROM grids WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
