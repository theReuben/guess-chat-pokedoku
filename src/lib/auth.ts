import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getDb } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
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

        const db = await getDb();
        const avatarUrl = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null;

        const existing = await db.execute({
          sql: "SELECT id FROM users WHERE id = ?",
          args: [profile.id as string],
        });

        if (existing.rows.length === 0) {
          await db.execute({
            sql: "INSERT INTO users (id, discord_username, display_name, avatar_url) VALUES (?, ?, ?, ?)",
            args: [profile.id as string, profile.username as string, profile.username as string, avatarUrl],
          });
        } else {
          await db.execute({
            sql: "UPDATE users SET discord_username = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?",
            args: [profile.username as string, avatarUrl, profile.id as string],
          });
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
