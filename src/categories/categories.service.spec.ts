import { ConflictException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

const gym = {
  id: 'cat-gym',
  name: 'Gimnasio',
  icon: 'fitness_center',
  type: TransactionType.EXPENSE,
  isDefault: false,
  userId: 'u1',
};

function setup() {
  const prisma = {
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn((args: { data: object }) => ({
        id: 'new',
        ...args.data,
      })),
      update: jest.fn((args: { data: object }) => ({ ...gym, ...args.data })),
      delete: jest.fn(),
    },
    transaction: { count: jest.fn().mockResolvedValue(0) },
  };
  const service = new CategoriesService(prisma as unknown as PrismaService);
  return { prisma, service };
}

describe('CategoriesService', () => {
  it('lists categories with the user movement count', async () => {
    const { prisma, service } = setup();
    prisma.category.findMany.mockResolvedValue([
      { ...gym, _count: { transactions: 3 } },
    ]);
    const [category] = await service.findAllForUser('u1');
    expect(category).toMatchObject({ id: 'cat-gym', transactionCount: 3 });
    expect(category).not.toHaveProperty('_count');
  });

  it('creates a trimmed category when the name is free', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(null);
    const created = await service.create('u1', {
      name: '  Gimnasio ',
      icon: 'fitness_center',
      type: TransactionType.EXPENSE,
    });
    expect(created).toMatchObject({ name: 'Gimnasio', transactionCount: 0 });
  });

  it('rejects a repeated name of the same type', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue({ ...gym, name: 'gimnasio' });
    await expect(
      service.create('u1', {
        name: 'Gimnasio',
        icon: 'x',
        type: TransactionType.EXPENSE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('only edits the user own categories', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(null);
    await expect(
      service.update('u1', 'cat-food', { name: 'Comidita' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps the type of a category in use', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(gym);
    prisma.transaction.count.mockResolvedValue(2);
    await expect(
      service.update('u1', 'cat-gym', { type: TransactionType.INCOME }),
    ).rejects.toThrow('No puedes cambiar el tipo');
  });

  it('renames and changes the icon', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst
      .mockResolvedValueOnce(gym)
      .mockResolvedValueOnce(null);
    const updated = await service.update('u1', 'cat-gym', {
      name: 'Deporte',
      icon: 'sports_soccer',
    });
    expect(updated).toMatchObject({ name: 'Deporte', icon: 'sports_soccer' });
  });

  it('refuses to delete a category with movements', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(gym);
    prisma.transaction.count.mockResolvedValue(1);
    await expect(service.remove('u1', 'cat-gym')).rejects.toThrow(
      'La categoría tiene 1 movimiento',
    );
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused category', async () => {
    const { prisma, service } = setup();
    prisma.category.findFirst.mockResolvedValue(gym);
    await service.remove('u1', 'cat-gym');
    expect(prisma.category.delete).toHaveBeenCalledWith({
      where: { id: 'cat-gym' },
    });
  });
});
