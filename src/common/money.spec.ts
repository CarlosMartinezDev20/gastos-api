import { Prisma } from '@prisma/client';
import { decimalsToNumbers } from './decimal-to-number.interceptor';
import { money } from './money';

describe('money', () => {
  it('turns database decimals into numbers rounded to cents', () => {
    expect(money(new Prisma.Decimal('0.1').plus('0.2'))).toBe(0.3);
    expect(money(12.345)).toBe(12.35);
    expect(money(null)).toBe(0);
  });
});

describe('decimalsToNumbers', () => {
  it('keeps the JSON contract: amounts as numbers, dates untouched', () => {
    const date = new Date('2026-10-07T00:00:00Z');
    expect(
      decimalsToNumbers([
        {
          amount: new Prisma.Decimal('8.50'),
          date,
          category: { name: 'Comida' },
          creditLimit: null,
        },
      ]),
    ).toEqual([
      { amount: 8.5, date, category: { name: 'Comida' }, creditLimit: null },
    ]);
  });
});
