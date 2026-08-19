import 'dotenv/config';
import { DEFAULT_STAGES } from '../src/lib/stages';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_EMAIL = 'demo@handled.test';
const DEMO_PASSWORD = 'demo-password-123';

async function main() {
  // Idempotent: re-running the seed refreshes the demo studio rather than
  // stacking duplicates on top of it.
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }
  await prisma.workspace.deleteMany({ where: { slug: 'demo-studio' } });

  const user = await prisma.user.create({
    data: {
      name: 'Demo Owner',
      email: DEMO_EMAIL,
      emailVerified: true,
      accounts: {
        create: {
          providerId: 'credential',
          accountId: DEMO_EMAIL,
          password: await hashPassword(DEMO_PASSWORD),
        },
      },
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Studio',
      slug: 'demo-studio',
      currency: 'AED',
      memberships: { create: { userId: user.id, role: 'OWNER' } },
      stages: { create: DEFAULT_STAGES },
      views: { create: { name: 'Main view', position: 0, isDefault: true } },
    },
    include: { stages: true },
  });

  const stage = (name: string) => workspace.stages.find((item) => item.name === name)?.id ?? null;

  const marina = await prisma.client.create({
    data: {
      workspaceId: workspace.id,
      name: 'Marina Events',
      company: 'Marina Events LLC',
      email: 'hello@marina-events.test',
      phone: '+971 4 555 0111',
    },
  });

  const orchard = await prisma.client.create({
    data: {
      workspaceId: workspace.id,
      name: 'Orchard & Vine',
      email: 'studio@orchardvine.test',
    },
  });

  const gala = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      clientId: marina.id,
      name: 'Autumn gala film',
      stageId: stage('Contract signed'),
      valueCents: 1_200_000,
      eventDate: new Date('2026-10-04'),
      description: 'Two-camera coverage plus a 90-second highlight edit.',
    },
  });

  await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      clientId: orchard.id,
      name: 'Spring lookbook',
      stageId: stage('Proposal'),
      valueCents: 480_000,
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId: workspace.id,
      clientId: marina.id,
      projectId: gala.id,
      number: 'INV-0001',
      status: 'SENT',
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { description: 'Shoot day — two operators', quantity: 1, unitPriceCents: 800_000, position: 0 },
          { description: 'Highlight edit', quantity: 1, unitPriceCents: 400_000, position: 1 },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amountCents: 600_000,
      method: 'BANK_TRANSFER',
      reference: 'Deposit',
    },
  });
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'PARTIALLY_PAID' } });

  await prisma.task.createMany({
    data: [
      { workspaceId: workspace.id, projectId: gala.id, title: 'Confirm venue access time' },
      { workspaceId: workspace.id, projectId: gala.id, title: 'Send shot list for approval' },
      { workspaceId: workspace.id, title: 'Chase Orchard & Vine on the proposal' },
    ],
  });

  console.log(`Seeded. Sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
