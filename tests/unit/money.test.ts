import { describe, expect, it } from 'vitest';
import { balanceCents, paidCents, parseMoneyToCents, subtotalCents } from '@/lib/money';

describe('parseMoneyToCents', () => {
  it('reads plain and formatted amounts', () => {
    expect(parseMoneyToCents('1250.50')).toBe(125050);
    expect(parseMoneyToCents('1,250.50')).toBe(125050);
    expect(parseMoneyToCents('AED 12')).toBe(1200);
  });

  it('rounds to the nearest minor unit rather than truncating', () => {
    expect(parseMoneyToCents('0.005')).toBe(1);
    expect(parseMoneyToCents('19.999')).toBe(2000);
  });

  it('rejects input with no number in it', () => {
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('abc')).toBeNull();
    expect(parseMoneyToCents('.')).toBeNull();
  });
});

describe('invoice arithmetic', () => {
  const items = [
    { quantity: 3, unitPriceCents: 25000 },
    { quantity: 1, unitPriceCents: 9999 },
  ];

  it('totals quantity times unit price', () => {
    expect(subtotalCents(items)).toBe(84999);
  });

  it('sums payments and reports what is left', () => {
    const payments = [{ amountCents: 50000 }, { amountCents: 4999 }];
    expect(paidCents(payments)).toBe(54999);
    expect(balanceCents(items, payments)).toBe(30000);
  });

  it('treats an empty invoice as zero, not NaN', () => {
    expect(subtotalCents([])).toBe(0);
    expect(balanceCents([], [])).toBe(0);
  });
});
