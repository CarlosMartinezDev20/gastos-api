import { ConflictException, NotFoundException } from '@nestjs/common';
import { CardBrand, PaymentMethodType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizePaymentMethod,
  PaymentMethodsService,
} from './payment-methods.service';

const fields = {
  name: 'Visa',
  type: PaymentMethodType.CREDIT_CARD,
  brand: CardBrand.VISA,
  last4: '4821',
  bank: 'Banco Agrícola',
  color: 'ink',
  creditLimit: 1500,
  statementDay: 15,
  dueDay: 5,
};
const visa = {
  ...fields,
  id: 'pm1',
  userId: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup() {
  const prisma = {
    paymentMethod: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn((args: { data: object }) => args.data),
      update: jest.fn((args: { data: object }) => args.data),
      delete: jest.fn(),
    },
  };
  const service = new PaymentMethodsService(prisma as unknown as PrismaService);
  return { prisma, service };
}

describe('normalizePaymentMethod', () => {
  it('keeps card and credit fields only where they apply', () => {
    expect(
      normalizePaymentMethod({ ...fields, type: PaymentMethodType.DEBIT_CARD }),
    ).toMatchObject({
      brand: CardBrand.VISA,
      last4: '4821',
      creditLimit: null,
      statementDay: null,
      dueDay: null,
    });
    expect(
      normalizePaymentMethod({ ...fields, type: PaymentMethodType.CASH }),
    ).toMatchObject({
      brand: null,
      last4: null,
      bank: null,
      creditLimit: null,
    });
    expect(
      normalizePaymentMethod({ ...fields, type: PaymentMethodType.DIGITAL }),
    ).toMatchObject({ last4: null, bank: 'Banco Agrícola' });
  });
});

describe('PaymentMethodsService', () => {
  it('lists the wallet with how many movements use each method', async () => {
    const { prisma, service } = setup();
    prisma.paymentMethod.findMany.mockResolvedValue([
      { ...visa, _count: { transactions: 3 } },
    ]);
    const [method] = await service.findAll('u1');
    expect(method).toMatchObject({ id: 'pm1', transactionCount: 3 });
    expect(method).not.toHaveProperty('_count');
    expect(prisma.paymentMethod.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('creates a cash method without card fields', async () => {
    const { prisma, service } = setup();
    prisma.paymentMethod.findFirst.mockResolvedValue(null);
    await service.create('u1', {
      name: ' Efectivo ',
      type: PaymentMethodType.CASH,
      color: 'mint',
      last4: '1234',
    });
    expect(prisma.paymentMethod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        name: 'Efectivo',
        last4: null,
      }) as object,
    });
  });

  it('rejects a repeated name, ignoring case', async () => {
    const { prisma, service } = setup();
    prisma.paymentMethod.findFirst.mockResolvedValue(visa);
    await expect(
      service.create('u1', {
        name: 'VISA',
        type: PaymentMethodType.DEBIT_CARD,
        color: 'ink',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.paymentMethod.create).not.toHaveBeenCalled();
  });

  it('updates with undefined keeping and null clearing fields', async () => {
    const { prisma, service } = setup();
    prisma.paymentMethod.findFirst.mockResolvedValue(visa);
    await service.update('u1', 'pm1', { creditLimit: null, color: 'lime' });
    expect(prisma.paymentMethod.update).toHaveBeenCalledWith({
      where: { id: 'pm1' },
      data: expect.objectContaining({
        name: 'Visa',
        color: 'lime',
        creditLimit: null,
        statementDay: 15,
        last4: '4821',
      }) as object,
    });
    // Same name: no uniqueness check against itself.
    expect(prisma.paymentMethod.findFirst).toHaveBeenCalledTimes(1);
  });

  it("returns 404 for another user's method", async () => {
    const { prisma, service } = setup();
    prisma.paymentMethod.findFirst.mockResolvedValue(null);
    await expect(service.remove('u1', 'pm1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.paymentMethod.delete).not.toHaveBeenCalled();
  });
});
