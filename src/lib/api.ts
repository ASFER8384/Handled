import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Which inputs are at fault, so a form can mark them rather than the page. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/**
 * Wraps a route handler so every failure leaves by the same door: Zod issues
 * become 422 with field errors, HttpError keeps its status, anything else is a
 * logged 500 that never leaks internals to the client.
 */
export function handler<T extends unknown[]>(
  fn: (ctx: WorkspaceContext, ...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      const ctx = await getWorkspaceContext();
      if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
      return await fn(ctx, ...args);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Please check the highlighted fields', fields: fieldErrors(error) },
          { status: 422 },
        );
      }
      if (error instanceof HttpError) {
        return NextResponse.json(
          { error: error.message, ...(error.fields ? { fields: error.fields } : {}) },
          { status: error.status },
        );
      }
      console.error('[api]', error);
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
  };
}

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    out[key] ??= issue.message;
  }
  return out;
}

/** Parses a JSON body against a schema, throwing ZodError for `handler` to map. */
export async function parseBody<S extends ZodType>(request: Request, schema: S) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, 'Expected a JSON body');
  }
  return schema.parse(raw) as import('zod').infer<S>;
}

export function notFound(what: string): never {
  throw new HttpError(404, `${what} not found`);
}

/** Digits only, so +971 50 123 4567 and 00971501234567 are seen as one number. */
function sameNumber(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^00/, '');
  // The last nine are the part that identifies the line; the rest is country
  // and trunk prefixes people write inconsistently.
  return digits.slice(-9);
}

/**
 * Refuses a contact that is really one you already have. Two rows for one
 * person split their email history in two and make "who did I write to"
 * unanswerable, so an address or a number already in use is turned away and
 * the field holding it is named.
 */
export async function refuseDuplicateContact(
  workspaceId: string,
  contact: { email?: string | null; phone?: string | null },
  ignoreId?: string,
): Promise<void> {
  const email = contact.email?.trim();
  const phone = contact.phone?.trim();
  if (!email && !phone) return;

  const others = await prisma.client.findMany({
    where: { workspaceId, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { name: true, email: true, phone: true },
  });

  if (email) {
    const taken = others.find(
      (other) => other.email?.trim().toLowerCase() === email.toLowerCase(),
    );
    if (taken) {
      throw new HttpError(409, `${email} is already saved as ${taken.name}.`, {
        email: `Already used by ${taken.name}.`,
      });
    }
  }

  if (phone && sameNumber(phone).length >= 7) {
    const taken = others.find(
      (other) => other.phone && sameNumber(other.phone) === sameNumber(phone),
    );
    if (taken) {
      throw new HttpError(409, `${phone} is already saved as ${taken.name}.`, {
        phone: `Already used by ${taken.name}.`,
      });
    }
  }
}
