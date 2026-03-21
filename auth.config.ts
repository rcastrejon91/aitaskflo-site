import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config — no Node.js imports
// The credentials provider here is a stub; actual DB lookup happens in auth.ts
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET ?? "lyra-dev-secret-change-in-production",
  providers: [],
  callbacks: {
    authorized({ auth }) {
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
