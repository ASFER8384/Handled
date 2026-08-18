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
  notes: optionalText(2000),
});

// --- Projects ---------------------------------------------------------------

export const projectStages = [
  'INQUIRY',
  'PROPOSAL_SENT',
  'BOOKED',
  'IN_PROGRESS',
  'COMPLETED',
  'ARCHIVED',
] as const;

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Name this project').max(140),
  clientId: z.string().min(1, 'Pick a client'),
  stage: z.enum(projectStages).default('INQUIRY'),
  description: optionalText(2000),
  eventDate: optionalDate,
  valueCents: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
});

export const projectStageSchema = z.object({ stage: z.enum(projectStages) });

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
  targetStage: z.enum(projectStages).optional(),
});

export const automationSchema = z
  .object({
    name: z.string().trim().min(1, 'Name this automation').max(140),
    trigger: z.enum(automationTriggers),
    triggerStage: z.enum(projectStages).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('INACTIVE'),
    steps: z.array(automationStepSchema).max(40).default([]),
  })
  .refine(
    (value) => value.trigger !== 'PROJECT_STAGE_CHANGED' || Boolean(value.triggerStage),
    { message: 'Pick the stage that should set this off', path: ['triggerStage'] },
  )
  .refine((value) => value.steps.every((step) => step.action !== 'MOVE_STAGE' || step.targetStage), {
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
