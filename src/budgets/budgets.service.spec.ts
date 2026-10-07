import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from './budgets.service';

const food = {
  id: 'cat-food',
  name: 'Comida',
  type: TransactionType.EXPENSE,
  isDefault: true,
  userId: null,
};

function setup() {
  const prisma = {
    category: { findFirst: jest.fn() },
    budget: {
      findMany: jest.fn(),
      upsert: jest.fn((args: object) => args),
      deleteMany: jest.fn(),
    },
    transaction: { groupBy: jest.fn() },
  };
  const service = new BudgetsService(prisma as unknown as PrismaService);
  return { prisma, service };
}

describe('BudgetsService', () => {
  it('adds what was spent this month to each budget', async () => {
    const { prisma, service } = setup();
    prisma.budget.findMany.mockResolvedValue([
      { id: 'b1', categoryId: 'cat-food', amount: 100, category: food },
    ]);
    prisma.transaction.groupBy.mockResolvedValue([
      { categoryId: 'cat-food', _sum: { amount: 125.5 } },
    ]);
    const [budget] = await service.findAll('u1', '2026-10-01T05:00:00.000Z');
    expect(budget).toMatchObject({
      spent: 125.5,
      remaining: -25.5,
      percent: 125.5,
    });
    // One calendar month from the user's month start; goal savings excluded.
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          goalId: null,
          date: {
            gte: new Date('2026-10-01T05:00:00.000Z'),
            lt: new Date('2026-11-01T05:00:00.000Z'),
          },
        }) as object,
      }),
    );
  });

  it('skips the spending query without budgets', async () => {
    const { prisma, service } = setup();
    prisma.budget.findMany.mockResolvedValue([]);
    expect(await service.findAll('u1')).toEqual([]);
    expect(prisma.transaction.groupBy).not.toHaveBeenCalled();
  });

  it('upserts the budget of an expense category', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(food);
    await service.set('u1', 'cat-food', 80);
    expect(prisma.budget.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { amount: 80 } }),
    );
  });

  it('rejects income and savings categories', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue({
      ...food,
      type: TransactionType.INCOME,
    });
    await expect(service.set('u1', 'x', 10)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    prisma.category.findFirst.mockResolvedValue({ ...food, name: 'Ahorro' });
    await expect(service.set('u1', 'x', 10)).rejects.toThrow(
      'Los aportes de ahorro no llevan presupuesto',
    );
  });

  it('404s for a category the user cannot use or a missing budget', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(null);
    await expect(service.set('u1', 'x', 10)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    prisma.budget.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('u1', 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
