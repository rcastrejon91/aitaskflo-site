import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { getAuthUserByUsernameOrEmail } from "@/lib/lyra/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        const user = getAuthUserByUsernameOrEmail(credentials.email as string);
        console.log("[auth] lookup:", credentials.email, "found:", !!user, "hash_len:", user?.password_hash?.length);
        if (!user || !user.password_hash) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password_hash);
        console.log("[auth] bcrypt match:", valid);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
});
