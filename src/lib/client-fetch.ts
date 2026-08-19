'use client';

export type ApiFailure = { error: string; fields?: Record<string, string> };

/**
 * Thin wrapper so every form handles failure the same way: the route handlers
 * always answer with `{ error }`, so callers get a message instead of a status.
 */
export async function api<T>(
  url: string,
  init: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown },
): Promise<{ data: T; error: null } | { data: null; error: ApiFailure }> {
  const response = await fetch(url, {
    method: init.method,
    headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: (payload as ApiFailure) ?? { error: 'The server did not respond properly' },
    };
  }
  return { data: payload as T, error: null };
}
