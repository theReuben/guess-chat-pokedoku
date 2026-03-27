import { auth } from "./auth";

const ADMIN_IDS = new Set(
  (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean)
);

export async function isAdmin(): Promise<{ isAdmin: boolean; userId: string | null }> {
  const session = await auth();
  const userId = session?.user?.id || null;
  return { isAdmin: !!userId && ADMIN_IDS.has(userId), userId };
}
