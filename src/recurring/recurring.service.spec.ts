import { RecurrenceFrequency, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { nextOccurrence, RecurringService } from './recurring.service';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('nextOccurrence', () => {
  it('adds a week', () => {
    const next = nextOccurrence(
      new Date('2026-10-28T12:00:00Z'),
      RecurrenceFrequency.WEEKLY,
      28,
    );
    expect(iso(next)).toBe('2026-11-04');
  });

  it('keeps the anchor day across short months and years', () => {
    let date = new Date('2026-12-31T12:00:00Z');
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      date = nextOccurrence(date, RecurrenceFrequency.MONTHLY, 31);
      seen.push(iso(date));
    }
    expect(seen).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });
});

describe('RecurringService.materialize', () => {
  const rule = {
    id: 'r1',
    userId: 'u1',
    categoryId: 'cat-work',
    title: 'Mesada',
    amount: 150,
    type: TransactionType.INCOME,
    frequency: RecurrenceFrequency.MONTHLY,
    anchorDay: 1,
    nextDate: new Date('2026-08-01T12:00:00Z'),
    active: true,
    paymentMethodId: 'pm1',
  };

  function setup(claimed = 1) {
    const tx = {
      recurringTransaction: {
        updateMany: jest.fn().mockResolvedValue({ count: claimed }),
      },
      transaction: { create: jest.fn() },
    };
    const prisma = {
      recurringTransaction: { findMany: jest.fn().mockResolvedValue([rule]) },
      $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    };
    const service = new RecurringService(prisma as unknown as PrismaService);
    return { tx, service };
  }

  it('creates every due occurrence up to now', async () => {
    const { tx, service } = setup();
    await service.materialize('u1', new Date('2026-10-03T00:00:00Z'));
    const dates = tx.transaction.create.mock.calls.map((call: unknown[]) =>
      iso((call[0] as { data: { date: Date } }).data.date),
    );
    expect(dates).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
  });

  it("pays each occurrence with the rule's payment method", async () => {
    const { tx, service } = setup();
    await service.materialize('u1', new Date('2026-08-02T00:00:00Z'));
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recurringId: 'r1',
        paymentMethodId: 'pm1',
      }) as object,
    });
  });

  it('skips occurrences another request already claimed', async () => {
    const { tx, service } = setup(0);
    await service.materialize('u1', new Date('2026-10-03T00:00:00Z'));
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(tx.recurringTransaction.updateMany).toHaveBeenCalledTimes(1);
  });
});
