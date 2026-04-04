import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — no Node.js imports
// The credentials provider here is a stub; actual DB lookup happens in auth.ts
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      // Allow API key access for programmatic/test requests
      const apiKey = request?.headers?.get("x-api-key");
      if (apiKey && process.env.ADMIN_PASSWORD && apiKey === process.env.ADMIN_PASSWORD) {
        return true;
      }
      // Public routes — no auth required
      const pathname = request?.nextUrl?.pathname ?? "";
      const publicPaths = [
        "/api/game/build",   // game build status check
        "/api/games",        // marketplace game list + ratings + play count
        "/games",            // marketplace UI pages
        "/play",             // game player page
      ];
      if (publicPaths.some(p => pathname.startsWith(p))) return true;
      return !!auth;
    },
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.userId) (session.user as { id: string } & typeof session.user).id = token.userId as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
