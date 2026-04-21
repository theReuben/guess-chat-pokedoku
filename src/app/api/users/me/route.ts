import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

// GET /api/users/me - get current user profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [session.user.id],
  });
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

// PATCH /api/users/me - update display name
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { displayName } = await req.json();
  if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }
  if (displayName.trim().length > 32) {
    return NextResponse.json({ error: "Display name must be 32 characters or less" }, { status: 400 });
  }

  const db = await getDb();
  await db.execute({
    sql: "UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE id = ?",
    args: [displayName.trim(), session.user.id],
  });

  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [session.user.id],
  });
  return NextResponse.json(result.rows[0]);
}
