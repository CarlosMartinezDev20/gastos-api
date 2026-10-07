import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { SavingsGoalsService } from './savings-goals.service';

const goal = {
  id: 'g1',
  userId: 'u1',
  name: 'Laptop',
  targetAmount: 800,
  savedAmount: 200,
  icon: 'laptop_mac',
  bgColor: '',
  iconColor: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup(balance = 100) {
  const prisma = {
    savingsGoal: {
      findFirst: jest.fn().mockResolvedValue(goal),
      update: jest.fn().mockReturnValue(goal),
      delete: jest.fn(),
    },
    transaction: {
      create: jest.fn().mockReturnValue({}),
      updateMany: jest.fn().mockReturnValue({}),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
  const categories = {
    findSavingsCategory: jest.fn().mockResolvedValue({ id: 'cat-savings' }),
  };
  const transactions = {
    getAvailableBalance: jest.fn().mockResolvedValue(balance),
  };
  const service = new SavingsGoalsService(
    prisma as unknown as PrismaService,
    categories as unknown as CategoriesService,
    transactions as unknown as TransactionsService,
  );
  return { prisma, service };
}

describe('SavingsGoalsService', () => {
  it('reports progress capped at 100%', async () => {
    const { prisma, service } = setup();
    prisma.savingsGoal.update.mockReturnValue({ ...goal, savedAmount: 900 });
    const result = await service.addFunds('u1', 'g1', { amount: 50 });
    expect(result.progressPercent).toBe(100);
  });

  it('links the contribution to the goal', async () => {
    const { prisma, service } = setup();
    await service.addFunds('u1', 'g1', { amount: 50 });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        goalId: 'g1',
        categoryId: 'cat-savings',
        amount: 50,
      }),
    });
  });

  it('rejects contributions above the available balance', async () => {
    const { prisma, service } = setup(20);
    await expect(
      service.addFunds('u1', 'g1', { amount: 50 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('renames contribution and withdrawal titles with the goal', async () => {
    const { prisma, service } = setup();
    await service.update('u1', 'g1', { name: 'Tablet' });
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { goalId: 'g1', userId: 'u1', amount: { gt: 0 } },
      data: { title: 'Ahorro: Tablet' },
    });
    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { goalId: 'g1', userId: 'u1', amount: { lt: 0 } },
      data: { title: 'Retiro: Tablet' },
    });
  });

  it('returns the saved amount when deleting', async () => {
    const { service } = setup();
    await expect(service.remove('u1', 'g1')).resolves.toEqual({
      id: 'g1',
      returnedAmount: 200,
    });
  });

  it("returns 404 for another user's goal", async () => {
    const { prisma, service } = setup();
    prisma.savingsGoal.findFirst.mockResolvedValue(null);
    await expect(service.remove('u2', 'g1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.savingsGoal.delete).not.toHaveBeenCalled();
  });

  it('withdraws up to the saved amount as a negative contribution', async () => {
    const { prisma, service } = setup();
    await service.withdraw('u1', 'g1', { amount: 50 });
    expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
      where: { id: 'g1', savedAmount: { gte: 50 } },
      data: { savedAmount: { decrement: 50 } },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: -50,
        goalId: 'g1',
        title: 'Retiro: Laptop',
      }) as object,
    });
  });

  it('refuses to withdraw more than was saved', async () => {
    const { prisma, service } = setup();
    await expect(service.withdraw('u1', 'g1', { amount: 250 })).rejects.toThrow(
      'Solo hay 200.00 ahorrados en esta meta',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
