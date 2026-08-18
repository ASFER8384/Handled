import type { AutomationAction, AutomationTrigger } from '@/generated/prisma/enums';

/**
 * Display strings live apart from the engine: the builder and the new-automation
 * form are client components, and importing them from `@/lib/automations` would
 * pull Prisma into the browser bundle.
 */

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  PROJECT_CREATED: 'Project created',
  PROJECT_STAGE_CHANGED: 'Project enters stage',
  CLIENT_CREATED: 'Client added',
  INVOICE_SENT: 'Invoice sent',
  INVOICE_PAID: 'Invoice paid in full',
};

export const ACTION_LABELS: Record<AutomationAction, string> = {
  SEND_EMAIL: 'Send email',
  CREATE_TASK: 'Create task',
  MOVE_STAGE: 'Move project stage',
};
