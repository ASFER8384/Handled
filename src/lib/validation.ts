import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? new Date(value) : undefined))
  .refine((value) => value === undefined || !Number.isNaN(value.getTime()), 'Invalid date');

// --- Auth -------------------------------------------------------------------

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name').max(80),
  email: z.email('Enter a valid email').max(160),
  password: z
    .string()
    .min(10, 'Use at least 10 characters')
    .max(200, 'That password is too long'),
});

export const signInSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

// --- Clients ----------------------------------------------------------------

export const clientSchema = z.object({
  name: z.string().trim().min(1, 'A client needs a name').max(120),
  email: z.union([z.email(), z.literal('')]).optional(),
  phone: optionalText(40),
  company: optionalText(120),
  jobTitle: optionalText(120),
  website: optionalText(200),
  address: optionalText(400),
  lastInteractionAt: optionalDate,
  notes: optionalText(1000),
});

// --- Projects ---------------------------------------------------------------

export const stageGroups = ['OPPORTUNITY', 'PROJECT'] as const;

// --- Project views ----------------------------------------------------------

const viewName = z.string().trim().min(1, 'Name this view').max(60);

export const projectViewCreateSchema = z.object({
  name: viewName.optional(),
  duplicateOf: optionalText(40),
});

export const projectViewPatchSchema = z
  .object({
    name: viewName.optional(),
    layout: z.enum(['BOARD', 'LIST']).optional(),
    showGroups: z.boolean().optional(),
    hiddenProps: z.array(z.string().max(40)).max(20).optional(),
  })
  .strict();

export const pipelineStageSchema = z.object({
  /** Existing stages keep their id; new ones arrive without one. */
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Name this stage').max(60),
  group: z.enum(stageGroups),
  hidden: z.coerce.boolean().default(false),
});

export const pipelineStagesSchema = z.object({
  stages: z.array(pipelineStageSchema).min(1, 'Keep at least one stage'),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Name this project').max(140),
  clientId: z.string().min(1, 'Pick a client'),
  stageId: optionalText(40),
  description: optionalText(2000),
  type: optionalText(80),
  leadSource: optionalText(80),
  location: optionalText(200),
  eventDate: optionalDate,
  endsAt: optionalDate,
  allDay: z.coerce.boolean().default(true),
  timezone: optionalText(60),
  valueCents: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
});

export const projectStageSchema = z.object({ stageId: z.string().min(1, 'Pick a stage') });

/** Stage moves and re-assignment are the two edits the app makes to a project. */
export const projectPatchSchema = z
  .object({
    stageId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
  })
  .refine((value) => value.stageId !== undefined || value.clientId !== undefined, {
    message: 'Nothing to update',
  });

// --- Invoices ---------------------------------------------------------------

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Describe this line').max(200),
  quantity: z.coerce.number().int().min(1, 'At least 1').max(10_000),
  unitPriceCents: z.coerce.number().int().min(0).max(1_000_000_000),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Pick a client'),
  projectId: optionalText(40),
  dueAt: optionalDate,
  notes: optionalText(2000),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line item'),
});

export const invoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'VOID']),
});

// --- Payments ---------------------------------------------------------------

export const paymentSchema = z.object({
  amountCents: z.coerce.number().int().min(1, 'Enter an amount'),
  method: z.enum(['BANK_TRANSFER', 'CARD', 'CASH', 'CHEQUE', 'OTHER']).default('BANK_TRANSFER'),
  reference: optionalText(80),
  paidAt: optionalDate,
});

// --- Tasks ------------------------------------------------------------------

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'What needs doing?').max(200),
  projectId: optionalText(40),
  dueAt: optionalDate,
});

export const taskToggleSchema = z.object({ done: z.boolean() });

// --- Automations ------------------------------------------------------------

export const automationTriggers = [
  'PROJECT_CREATED',
  'PROJECT_STAGE_CHANGED',
  'CLIENT_CREATED',
  'INVOICE_SENT',
  'INVOICE_PAID',
] as const;

export const automationActions = ['SEND_EMAIL', 'CREATE_TASK', 'MOVE_STAGE'] as const;

export const automationStepSchema = z.object({
  action: z.enum(automationActions),
  delayMinutes: z.coerce.number().int().min(0).max(525_600).default(0),
  subject: optionalText(200),
  body: optionalText(4000),
  targetStageId: optionalText(40),
});

export const automationSchema = z
  .object({
    name: z.string().trim().min(1, 'Name this automation').max(140),
    trigger: z.enum(automationTriggers),
    triggerStageId: optionalText(40),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('INACTIVE'),
    steps: z.array(automationStepSchema).max(40).default([]),
  })
  .refine(
    (value) => value.trigger !== 'PROJECT_STAGE_CHANGED' || Boolean(value.triggerStageId),
    { message: 'Pick the stage that should set this off', path: ['triggerStageId'] },
  )
  .refine((value) => value.steps.every((step) => step.action !== 'MOVE_STAGE' || step.targetStageId), {
    message: 'A move-stage step needs a target stage',
    path: ['steps'],
  })
  .refine(
    (value) => value.steps.every((step) => step.action === 'MOVE_STAGE' || Boolean(step.subject)),
    { message: 'Give every email and task step a subject', path: ['steps'] },
  );

/** Strict: a body carrying anything besides `status` is an edit, not a toggle. */
export const automationStatusSchema = z
  .object({ status: z.enum(['ACTIVE', 'INACTIVE']) })
  .strict();

export type ClientInput = z.input<typeof clientSchema>;
export type AutomationInput = z.input<typeof automationSchema>;
export type AutomationStepInput = z.input<typeof automationStepSchema>;
export type ProjectInput = z.input<typeof projectSchema>;
export type InvoiceInput = z.input<typeof invoiceSchema>;
export type PaymentInput = z.input<typeof paymentSchema>;
export type TaskInput = z.input<typeof taskSchema>;
