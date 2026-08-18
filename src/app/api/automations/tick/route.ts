import { NextResponse } from 'next/server';
import { handler } from '@/lib/api';
import { sweepDueSteps } from '@/lib/automations';

/**
 * Runs whatever has come due. Point a cron at this (Render Cron, cron-job.org)
 * so delayed steps fire without anyone visiting the app. Safe to call often.
 */
export const POST = handler(async (ctx) => {
  const executed = await sweepDueSteps(ctx.workspaceId);
  return NextResponse.json({ ok: true, executed });
});
