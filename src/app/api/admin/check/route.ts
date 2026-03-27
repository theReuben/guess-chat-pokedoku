import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

// GET /api/admin/check - check if current user is admin
export async function GET() {
  const { isAdmin: admin } = await isAdmin();
  return NextResponse.json({ isAdmin: admin });
}
