import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  // Next.js dev hot-reload would otherwise open a new pool on every edit.
  if (process.env.NODE_ENV !== 'production') return (globalForPrisma.prisma ??= createClient());
  return (client ??= createClient());
}

/**
 * Connects on first use, not on import. `next build` loads every route module
 * to collect page data, so importing this must not require DATABASE_URL —
 * otherwise the build depends on a runtime secret it has no business needing.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getClient() as unknown as Record<string | symbol, unknown>;
    const value = instance[property];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  has(_target, property) {
    return property in (getClient() as unknown as object);
  },
});
