import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_STAGES } from '@/lib/stages';
import { slugify } from '@/lib/slug';

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type WorkspaceContext = {
  userId: string;
  userName: string;
  userEmail: string;
  workspaceId: string;
  workspaceName: string;
  currency: string;
};

/**
 * Resolves the caller's active workspace, creating their personal one on first
 * use. Sign-up and workspace creation are deliberately decoupled: a half-failed
 * sign-up never leaves an account that can't reach the app.
 */
export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const session = await getSession();
  if (!session) return null;

  const { user } = session;
  const existing = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    include: { workspace: true },
  });

  const workspace =
    existing?.workspace ??
    (await prisma.workspace.create({
      data: {
        name: `${user.name || user.email.split('@')[0]}'s Studio`,
        slug: await uniqueSlug(user.name || user.email.split('@')[0]),
        memberships: { create: { userId: user.id, role: 'OWNER' } },
        // A workspace without a pipeline has nowhere to put a project.
        stages: { create: DEFAULT_STAGES },
        views: { create: { name: 'Main view', position: 0, isDefault: true } },
      },
    }));

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    currency: workspace.currency,
  };
});

/** Server-component guard: bounces anonymous visitors to sign-in. */
export async function requireWorkspace(): Promise<WorkspaceContext> {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect('/sign-in');
  return ctx;
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'studio';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const taken = await prisma.workspace.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
  }
  return `${root}-${Math.floor(Math.random() * 1_000_000)}`;
}
