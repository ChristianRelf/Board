import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, users, accounts, sessions, verificationTokens } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: { id: string; discordId?: string | null } & DefaultSession["user"];
  }
  interface User {
    discordId?: string | null;
  }
}

const allowlist = (process.env.ALLOWED_DISCORD_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    Discord({
      authorization:
        "https://discord.com/api/oauth2/authorize?scope=identify+email",
      profile(p) {
        const image = p.avatar
          ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.${
              p.avatar.startsWith("a_") ? "gif" : "png"
            }?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${
              (BigInt(p.id) >> 22n) % 6n
            }.png`;
        return {
          id: p.id,
          discordId: p.id,
          name: p.global_name ?? p.username,
          email: p.email,
          image,
        };
      },
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      if (!allowlist.length) return true;
      return !!profile?.id && allowlist.includes(String(profile.id));
    },
    session({ session, user }) {
      session.user.id = user.id;
      session.user.discordId = user.discordId ?? null;
      return session;
    },
  },
});
