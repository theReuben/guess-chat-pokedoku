import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import getDb from "@/lib/db";

// GET /api/users - list all users (for guess dropdown)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const result = await db.execute(
    "SELECT id, display_name, avatar_url FROM users ORDER BY display_name"
  );

  return NextResponse.json(result.rows);
}
