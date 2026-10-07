import { Prisma } from '@prisma/client';

/** An amount as the database returns it (or a plain number in tests). */
export type Money = Prisma.Decimal | number | null | undefined;

/**
 * Money is stored as DECIMAL(12,2) and summed by Postgres, both exact; in
 * JavaScript it becomes a number rounded to cents for arithmetic and JSON.
 */
export function money(value: Money): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : value.toNumber();
  return Math.round(n * 100) / 100;
}
