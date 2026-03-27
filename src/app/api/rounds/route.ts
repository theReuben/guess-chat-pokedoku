import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";
import { generateId } from "@/lib/utils";

// GET /api/rounds - list all rounds
export async function GET() {
  const db = getDb();
  const rounds = db.prepare(`
    SELECT r.*, COUNT(g.id) as grid_count
    FROM rounds r
    LEFT JOIN grids g ON g.round_id = r.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `).all();
  return NextResponse.json(rounds);
}

// POST /api/rounds - create a new round
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  const id = generateId();
  db.prepare(`
    INSERT INTO rounds (id, name, created_by) VALUES (?, ?, ?)
  `).run(id, name.trim(), session.user.id);

  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(id);
  return NextResponse.json(round, { status: 201 });
}
