import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { handler, HttpError, parseBody } from '@/lib/api';
import { passwordSchema } from '@/lib/validation';

/**
 * Changing a password goes through the auth library, not the database: it
 * knows the hash, and it is the thing that must agree the old one was right.
 */
export const POST = handler(async (_ctx, request: Request) => {
  const data = await parseBody(request, passwordSchema);

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        // Everything else stays signed in; this is a change, not a breach.
        revokeOtherSessions: false,
      },
    });
  } catch {
    throw new HttpError(422, 'That current password is not right', {
      currentPassword: 'That is not your current password',
    });
  }

  return NextResponse.json({ ok: true });
});
