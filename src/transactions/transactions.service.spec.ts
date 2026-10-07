import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecurringService } from '../recurring/recurring.service';
import { TransactionsService } from './transactions.service';

const food = {
  id: 'cat-food',
  name: 'Comida',
  type: TransactionType.EXPENSE,
  isDefault: true,
  userId: null,
};
const savings = { ...food, id: 'cat-savings', name: 'Ahorro' };

function setup() {
  const prisma = {
    category: { findFirst: jest.fn() },
    paymentMethod: { findFirst: jest.fn() },
    transaction: {
      findFirst: jest.fn(),
      create: jest.fn((args: { data: object }) => args.data),
      update: jest.fn((args: { data: object }) => args.data),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
  };
  const recurring = { materialize: jest.fn() };
  const service = new TransactionsService(
    prisma as unknown as PrismaService,
    recurring as unknown as RecurringService,
  );
  return { prisma, service };
}

const expense = {
  title: 'Almuerzo',
  amount: 8,
  type: TransactionType.EXPENSE,
  categoryId: 'cat-food',
};

describe('TransactionsService', () => {
  it('creates a movement in a matching category', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(food);
    await service.create('u1', expense);
    expect(prisma.transaction.create).toHaveBeenCalled();
  });

  it('records how it was paid and a reference', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(food);
    prisma.paymentMethod.findFirst.mockResolvedValue({ id: 'pm1' });
    await service.create('u1', {
      ...expense,
      paymentMethodId: 'pm1',
      reference: '  ABC-123 ',
    });
    expect(prisma.paymentMethod.findFirst).toHaveBeenCalledWith({
      where: { id: 'pm1', userId: 'u1' },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentMethodId: 'pm1',
          reference: 'ABC-123',
        }) as object,
      }),
    );
  });

  it("rejects another user's payment method", async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(food);
    prisma.paymentMethod.findFirst.mockResolvedValue(null);
    await expect(
      service.create('u1', { ...expense, paymentMethodId: 'pm-x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('clears the payment method with null and keeps it when omitted', async () => {
    const { prisma, service } = setup();
    prisma.transaction.findFirst.mockResolvedValue({
      id: 't1',
      goalId: null,
      categoryId: 'cat-food',
      type: TransactionType.EXPENSE,
    });
    await service.update('u1', 't1', { paymentMethodId: null });
    expect(prisma.transaction.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentMethodId: null }) as object,
      }),
    );
    await service.update('u1', 't1', { title: 'Otro' });
    expect(prisma.transaction.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentMethodId: undefined,
          reference: undefined,
        }) as object,
      }),
    );
    expect(prisma.paymentMethod.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a category of the other type', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(food);
    await expect(
      service.create('u1', { ...expense, type: TransactionType.INCOME }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects the reserved savings category', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(savings);
    await expect(
      service.create('u1', { ...expense, categoryId: 'cat-savings' }),
    ).rejects.toThrow('Los aportes de ahorro se registran desde Metas');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('does not update or delete goal contributions', async () => {
    const { prisma, service } = setup();
    prisma.transaction.findFirst.mockResolvedValue({ id: 't1', goalId: 'g1' });
    await expect(service.update('u1', 't1', { amount: 1 })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.remove('u1', 't1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.transaction.delete).not.toHaveBeenCalled();
  });

  it("returns 404 for another user's movement", async () => {
    const { prisma, service } = setup();
    prisma.transaction.findFirst.mockResolvedValue(null);
    await expect(service.remove('u1', 't1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: 't1', userId: 'u1' },
    });
  });

  it('keeps the current category when only the amount changes', async () => {
    const { prisma, service } = setup();
    prisma.transaction.findFirst.mockResolvedValue({
      id: 't1',
      goalId: null,
      categoryId: 'cat-food',
      type: TransactionType.EXPENSE,
    });
    await service.update('u1', 't1', { amount: 12 });
    expect(prisma.category.findFirst).not.toHaveBeenCalled();
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 12, categoryId: 'cat-food' }),
      }),
    );
  });

  it('computes the balance rounded to cents', async () => {
    const { prisma, service } = setup();
    prisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 100.005 } })
      .mockResolvedValueOnce({ _sum: { amount: null } });
    await expect(service.getBalance('u1')).resolves.toEqual({
      totalIncome: 100.01,
      totalExpense: 0,
      balance: 100.01,
    });
  });
});
