import type { NextAuthConfig } from 'next-auth';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/api/health',
  '/api/account/forgot-password',
  '/api/account/reset-password',
];

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPath = PUBLIC_PATHS.some(p => nextUrl.pathname.startsWith(p));

      if (isPublicPath) {
        if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/signup')) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
  providers: [],
};
