import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

// GET /api/users/me - get current user profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
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

  const db = getDb();
  db.prepare("UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE id = ?")
    .run(displayName.trim(), session.user.id);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.user.id);
  return NextResponse.json(user);
}
