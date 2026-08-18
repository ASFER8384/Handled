'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * No baseURL on purpose: the client posts to whatever origin served the page.
 * Pinning it to NEXT_PUBLIC_APP_URL breaks every deployment reached by another
 * hostname — Vercel preview URLs, a custom domain, the *.vercel.app alias —
 * because the request goes cross-origin and the session cookie is dropped.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
