import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Is this deployment actually alive?
 *
 * A page that loads proves the build shipped; it does not prove the database
 * is reachable or that the migrations ran, which is what breaks first when a
 * deployment is wired up wrong. So this asks the database directly.
 *
 * It answers without a session on purpose — the thing you check when nobody
 * can sign in cannot itself require signing in. It says nothing about the
 * data: no names, no counts, and never anything about how it connects.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();

  try {
    const [{ now }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT now() as now`;
    const migrations = await prisma.$queryRaw<{ name: string }[]>`
      SELECT migration_name AS name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `.catch(() => []);

    return NextResponse.json(
      {
        ok: true,
        database: 'up',
        databaseTime: now,
        // Which migration the schema is at, so a deployment running against a
        // database that never had `migrate deploy` shows up as behind.
        migration: migrations[0]?.name ?? null,
        ms: Date.now() - started,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    // The message can carry a host or a user, so only its class is reported.
    console.error('health: database unreachable', error);
    return NextResponse.json(
      { ok: false, database: 'down', ms: Date.now() - started },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
