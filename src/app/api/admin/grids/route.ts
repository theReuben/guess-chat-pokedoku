import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import getDb from "@/lib/db";

// GET /api/admin/grids - list ALL grids with creator info
export async function GET() {
  const { isAdmin: admin } = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const grids = db.prepare(`
    SELECT g.*, u.display_name as creator_name, u.discord_username
    FROM grids g
    JOIN users u ON u.id = g.created_by
    ORDER BY u.display_name, g.created_at DESC
  `).all();

  return NextResponse.json(grids);
}
