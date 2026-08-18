import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';

/**
 * Vercel serves the same deployment on several hostnames (the project alias,
 * the git-branch alias, per-deployment URLs). Trust all of them, or sign-in
 * fails on whichever one is not the configured baseURL.
 */
const vercelHosts = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

const baseURL =
  process.env.BETTER_AUTH_URL ?? vercelHosts[0] ?? 'http://localhost:3000';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL,
  trustedOrigins: [...new Set([baseURL, ...vercelHosts, 'http://localhost:3000'])],
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    password: {
      hash: hashPassword,
      verify: ({ hash, password }) => verifyPassword(hash, password),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh at most daily
  },
  // Must stay last: lets server actions/route handlers set the session cookie.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
