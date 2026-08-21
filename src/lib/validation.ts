import { z } from 'zod';
import { INVOICE_PART_KEYS } from '@/lib/invoice-parts';

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
  password: z.string().min(10, 'Use at least 10 characters').max(200, 'That password is too long'),
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
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
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
    sortField: z.string().max(40).nullable().optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
    filters: z
      .array(z.object({ field: z.string().max(40), value: z.string().max(120) }))
      .max(10)
      .optional(),
  })
  .strict();

export const projectNoteSchema = z.object({
  /** A note starts empty and is written into, so nothing here is required. */
  title: z.string().trim().max(200).optional(),
  body: z.string().max(20000).default(''),
  bodyHtml: z.string().max(200000).optional(),
  sharedWithClient: z.coerce.boolean().default(false),
});

export const projectNotePatchSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(20000).optional(),
  bodyHtml: z.string().max(200000).optional(),
  sharedWithClient: z.boolean().optional(),
});

export const projectFileSchema = z.object({
  name: z.string().trim().min(1, 'Name this file').max(120),
  url: z.string().trim().url('Give the link to the file').max(500),
});

export const projectContactSchema = z.object({
  /** Set when picking someone the workspace already knows. */
  clientId: z.string().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.union([z.email('That is not an email address'), z.literal('')]).optional(),
  phone: optionalText(40),
  lastInteractionAt: optionalDate,
  website: optionalText(200),
  jobTitle: optionalText(120),
  address: optionalText(400),
  notes: optionalText(1000),
});

export const projectMessageSchema = z.object({
  /** One or more recipients. Every one of them has to be a real address. */
  to: z
    .array(z.string().trim().email('That is not an email address').max(200))
    .min(1, 'Add someone to send it to')
    .max(20, 'That is more recipients than we send to at once'),
  subject: z.string().trim().min(1, 'Add a subject').max(200),
  body: z.string().trim().min(1, 'Write the message').max(20000),
  /** The formatted version. Plain text alone is still a valid message. */
  bodyHtml: z.string().max(200000).optional(),
  attachmentIds: z.array(z.string()).max(20).default([]),
  /** Set to hold it back until then, instead of sending it now. */
  scheduledFor: z.union([z.iso.datetime(), z.iso.date()]).optional(),
  replyToId: z.string().optional(),
  /** The invoice this email carries, so sending it marks that invoice sent. */
  invoiceId: z.string().optional(),
  /** Parked rather than sent. */
  draft: z.coerce.boolean().default(false),
});

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
/** A date that may be cleared, and may or may not carry a time. */
const nullableDate = z.union([z.iso.datetime(), z.iso.date(), z.literal(''), z.null()]).optional();

export const availabilities = ['BUSY', 'FREE'] as const;
export const fieldTypes = ['TEXT', 'LONG_TEXT', 'DATE', 'NUMBER', 'LINK', 'SELECT'] as const;

export const projectPatchSchema = z
  .object({
    stageId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    type: z.string().trim().max(80).optional(),
    leadSource: z.string().trim().max(80).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    name: z.string().trim().min(1, 'Name this project').max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(200).optional(),
    timezone: z.string().trim().max(60).optional(),
    dateTitle: z.string().trim().max(140).optional(),
    availability: z.enum(availabilities).optional(),
    eventDate: nullableDate,
    endsAt: nullableDate,
    allDay: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: 'Nothing to update',
  });

/** What can be done to a message that has not gone out yet. */
export const messageActionSchema = z.object({
  action: z.enum(['send', 'schedule', 'unschedule']),
  scheduledFor: z.union([z.iso.datetime(), z.iso.date()]).optional(),
});

export const projectDateSchema = z.object({
  title: z.string().trim().min(1, 'Name this date').max(140),
  startAt: nullableDate,
  endAt: nullableDate,
  allDay: z.coerce.boolean().default(false),
  availability: z.enum(availabilities).default('BUSY'),
  location: z.string().trim().max(200).optional(),
});

export const projectDatePatchSchema = projectDateSchema.partial();

export const customFieldSchema = z.object({
  name: z.string().trim().min(1, 'Name this field').max(60),
  type: z.enum(fieldTypes).default('TEXT'),
  options: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  visibleToClient: z.coerce.boolean().default(true),
});

export const customFieldPatchSchema = customFieldSchema.partial().omit({ type: true });

/** Every answer this project gives, sent together. An empty one clears it. */
export const projectFieldValuesSchema = z.object({
  values: z.array(z.object({ fieldId: z.string().min(1), value: z.string().max(2000) })).max(50),
});

// --- Invoices ---------------------------------------------------------------

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Describe this line').max(200),
  quantity: z.coerce.number().int().min(1, 'At least 1').max(10_000),
  unitPriceCents: z.coerce.number().int().min(0).max(1_000_000_000),
});

/**
 * One step of a payment schedule. The amount is stored, not a percentage, so
 * that what the client agreed to cannot be restated by a later edit.
 */
export const instalmentSchema = z.object({
  label: z.string().trim().min(1, 'Name this step').max(60),
  amountCents: z.coerce.number().int().min(0).max(1_000_000_000),
  dueAt: optionalDate,
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Pick a client'),
  /// Left out, the workspace's own sequence gives it one.
  number: z.string().trim().max(30).optional(),
  projectId: optionalText(40),
  dueAt: optionalDate,
  notes: optionalText(2000),
  /// Which sheet design it is drawn in, kept with the invoice.
  design: z.string().max(20).optional(),
  themeColor: z.string().max(20).optional(),
  themeFont: z.string().max(20).optional(),
  /// Snapshotted from the workspace when written, so a later rate change does
  /// not quietly restate an invoice that has already gone out.
  taxRateBp: z.coerce.number().int().min(0).max(10000).optional(),
  taxLabel: z.string().trim().max(20).optional(),
  /// Parts of the letterhead this invoice leaves off.
  hidden: z.array(z.enum(INVOICE_PART_KEYS as [string, ...string[]])).default([]),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line item'),
  /// Empty is the normal invoice: one due date, one payment.
  schedule: z.array(instalmentSchema).max(24, 'That is too many steps').default([]),
});

/** An edit replaces the lines wholesale, so it is the same shape as a create. */
export const invoiceEditSchema = invoiceSchema;

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

// --- Calendar events --------------------------------------------------------

/**
 * Something in the diary that is not a job.
 *
 * The times arrive as local strings from a date field — '2026-08-28T14:00' —
 * so they are read in the browser's own zone rather than shifted into UTC by
 * an ISO suffix nobody typed.
 */
export const eventSchema = z.object({
  title: z.string().trim().min(1, 'Give it a name').max(120),
  startAt: z.string().trim().min(1, 'When is it?'),
  endAt: optionalText(40),
  allDay: z.coerce.boolean().default(false),
  location: optionalText(160),
  note: optionalText(2000),
  projectId: optionalText(40),
  clientId: optionalText(40),
});

// --- Tasks ------------------------------------------------------------------

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'What needs doing?').max(200),
  projectId: optionalText(40),
  dueAt: optionalDate,
  dueHasTime: z.coerce.boolean().default(false),
  assigneeId: optionalText(40),
});

/** Every field a row can edit in place. Anything left out stays as it was. */
export const taskPatchSchema = z.object({
  done: z.boolean().optional(),
  title: z.string().trim().min(1, 'What needs doing?').max(200).optional(),
  /** Null clears the date. */
  dueAt: z.union([z.iso.datetime(), z.iso.date(), z.null()]).optional(),
  dueHasTime: z.boolean().optional(),
  /** Null takes it off whoever had it. */
  assigneeId: z.union([z.string().max(40), z.null()]).optional(),
  /** Null leaves it standing on its own, belonging to no project. */
  projectId: z.union([z.string().max(40), z.null()]).optional(),
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
  .refine((value) => value.trigger !== 'PROJECT_STAGE_CHANGED' || Boolean(value.triggerStageId), {
    message: 'Pick the stage that should set this off',
    path: ['triggerStageId'],
  })
  .refine(
    (value) => value.steps.every((step) => step.action !== 'MOVE_STAGE' || step.targetStageId),
    {
      message: 'A move-stage step needs a target stage',
      path: ['steps'],
    },
  )
  .refine(
    (value) => value.steps.every((step) => step.action === 'MOVE_STAGE' || Boolean(step.subject)),
    { message: 'Give every email and task step a subject', path: ['steps'] },
  );

/** Strict: a body carrying anything besides `status` is an edit, not a toggle. */
export const automationStatusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).strict();

export type ClientInput = z.input<typeof clientSchema>;
export type AutomationInput = z.input<typeof automationSchema>;
export type AutomationStepInput = z.input<typeof automationStepSchema>;
export type ProjectInput = z.input<typeof projectSchema>;
export type InvoiceInput = z.input<typeof invoiceSchema>;
export type PaymentInput = z.input<typeof paymentSchema>;
export type TaskInput = z.input<typeof taskSchema>;
export type EventInput = z.input<typeof eventSchema>;

// --- Views of the Contacts table --------------------------------------------

export const contactViewCreateSchema = z.object({
  name: viewName.optional(),
  duplicateOf: optionalText(40),
});

export const contactViewPatchSchema = z
  .object({
    name: viewName.optional(),
    hiddenColumns: z.array(z.string().max(40)).max(20).optional(),
    sortField: z.string().max(40).nullable().optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
    filters: z
      .array(z.object({ field: z.string().max(40), value: z.string().max(120) }))
      .max(10)
      .optional(),
  })
  .strict();

// --- Invoice templates ------------------------------------------------------

export const invoiceTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name it').max(80),
  notes: z.string().max(2000).default(''),
  dueInDays: z.number().int().min(0).max(365).default(14),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(9999),
      }),
    )
    .min(1, 'A template needs at least one line')
    .max(50),
});

export type InvoiceTemplateInput = z.input<typeof invoiceTemplateSchema>;

// --- Settings ---------------------------------------------------------------

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Your name cannot be blank').max(80),
  jobTitle: optionalText(60),
  phoneCode: optionalText(8),
  phone: optionalText(40),
  address: optionalText(300),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(10, 'Ten characters or more'),
    confirm: z.string(),
  })
  .refine((values) => values.newPassword === values.confirm, {
    message: 'Those two do not match',
    path: ['confirm'],
  });

export type PasswordInput = z.input<typeof passwordSchema>;

const link = z.string().trim().max(200).optional();

export const companySchema = z.object({
  name: z.string().trim().min(1, 'The business needs a name').max(80),
  trade: optionalText(60),
  email: z.union([z.email('That email does not look right'), z.literal('')]).optional(),
  phoneCode: optionalText(8),
  phone: optionalText(40),
  website: optionalText(120),
  /// Kept as one field as well as its parts: what prints on an invoice.
  address: optionalText(300),
  street: optionalText(160),
  city: optionalText(80),
  postcode: optionalText(24),
  region: optionalText(80),
  country: optionalText(80),
  timezone: optionalText(60),
  oneLiner: optionalText(160),
  about: optionalText(2000),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'A colour looks like #1F6F8B')
    .optional(),
  socials: z.record(z.string().max(20), link).optional(),
  currency: z.string().trim().length(3, 'Three letters, like AED').optional(),
  themeColor: z.string().max(20).optional(),
  themeFont: z.string().max(20).optional(),
});

export const bankSchema = z.object({
  bankName: optionalText(80),
  bankAccountName: optionalText(80),
  bankAccountNumber: optionalText(40),
  bankIban: optionalText(40),
  bankSwift: optionalText(20),
  bankNotes: optionalText(600),
  taxLabel: z.string().trim().max(20).optional(),
  taxNumber: optionalText(40),
  /// Basis points, so 5% is 500 and half a percent is representable.
  taxRateBp: z.coerce.number().int().min(0).max(10000).optional(),
});

export type BankInput = z.input<typeof bankSchema>;
export type AccountInput = z.input<typeof accountSchema>;
export type CompanyInput = z.input<typeof companySchema>;
