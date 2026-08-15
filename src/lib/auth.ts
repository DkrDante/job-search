import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // JWT sessions have no server-side session table to invalidate on
      // account deletion, so a deleted user's existing cookie would otherwise
      // keep authenticating until the token naturally expires. Check the user
      // still exists on every session read and strip `user` if not — every
      // route in this plan already guards on `if (!session?.user)`, so this
      // makes that guard correctly reject a deleted user without any
      // per-route changes.
      const exists = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { id: true },
      });
      if (!exists) {
        return { ...session, user: undefined } as unknown as typeof session;
      }
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
});
