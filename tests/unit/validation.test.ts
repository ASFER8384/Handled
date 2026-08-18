import { describe, expect, it } from 'vitest';
import { clientSchema, invoiceSchema, signUpSchema } from '@/lib/validation';

describe('signUpSchema', () => {
  it('demands a password long enough to be worth hashing', () => {
    const result = signUpSchema.safeParse({
      name: 'Nadia',
      email: 'nadia@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed sign-up', () => {
    const result = signUpSchema.safeParse({
      name: 'Nadia',
      email: 'nadia@example.com',
      password: 'a-long-enough-password',
    });
    expect(result.success).toBe(true);
  });
});

describe('clientSchema', () => {
  it('drops blank optional fields instead of storing empty strings', () => {
    const result = clientSchema.parse({ name: 'Atlas Studio', phone: '', company: '' });
    expect(result.phone).toBeUndefined();
    expect(result.company).toBeUndefined();
  });
});

describe('invoiceSchema', () => {
  it('refuses an invoice with no lines', () => {
    const result = invoiceSchema.safeParse({ clientId: 'abc', items: [] });
    expect(result.success).toBe(false);
  });

  it('coerces numeric strings from form inputs', () => {
    const result = invoiceSchema.parse({
      clientId: 'abc',
      items: [{ description: 'Shoot day', quantity: '2', unitPriceCents: '150000' }],
    });
    expect(result.items[0]).toMatchObject({ quantity: 2, unitPriceCents: 150000 });
  });
});
