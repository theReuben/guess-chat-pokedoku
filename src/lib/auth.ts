import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import getDb from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = profile.id;
        token.username = profile.username;
        token.avatar = profile.avatar;

        // Upsert user in DB
        const db = getDb();
        const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(profile.id as string) as Record<string, unknown> | undefined;
        const avatarUrl = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : undefined;

        if (!existing) {
          db.prepare(
            "INSERT INTO users (id, discord_username, display_name, avatar_url) VALUES (?, ?, ?, ?)"
          ).run(profile.id, profile.username, profile.username, avatarUrl || null);
        } else {
          db.prepare(
            "UPDATE users SET discord_username = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
          ).run(profile.username, avatarUrl || null, profile.id);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.discordId as string;
        session.user.name = token.username as string;
        session.user.image = token.avatar
          ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.avatar}.png`
          : undefined;
      }
      return session;
    },
  },
});

// Helper: get a user's display name from DB
export function getDisplayName(userId: string): string {
  const db = getDb();
  const user = db.prepare("SELECT display_name FROM users WHERE id = ?").get(userId) as { display_name: string } | undefined;
  return user?.display_name || "Unknown";
}
