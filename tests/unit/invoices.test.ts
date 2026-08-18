import { describe, expect, it } from 'vitest';
import { deriveStatus } from '@/lib/invoices';

const items = [{ quantity: 2, unitPriceCents: 50000 }]; // 1,000.00

describe('deriveStatus', () => {
  it('leaves drafts and voids alone regardless of payments', () => {
    expect(deriveStatus('DRAFT', items, [{ amountCents: 100000 }])).toBe('DRAFT');
    expect(deriveStatus('VOID', items, [{ amountCents: 100000 }])).toBe('VOID');
  });

  it('stays SENT until money arrives', () => {
    expect(deriveStatus('SENT', items, [])).toBe('SENT');
  });

  it('reports a part payment', () => {
    expect(deriveStatus('SENT', items, [{ amountCents: 40000 }])).toBe('PARTIALLY_PAID');
  });

  it('settles on exact payment', () => {
    expect(deriveStatus('PARTIALLY_PAID', items, [{ amountCents: 100000 }])).toBe('PAID');
  });

  it('settles when several payments add up', () => {
    const payments = [{ amountCents: 60000 }, { amountCents: 40000 }];
    expect(deriveStatus('SENT', items, payments)).toBe('PAID');
  });
});
