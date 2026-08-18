import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { getWorkspaceContext, type WorkspaceContext } from '@/lib/session';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
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
        return NextResponse.json({ error: error.message }, { status: error.status });
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
