import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecurringService } from '../recurring/recurring.service';
import { resolveMovementCategory } from './category-rules';
import { assertOwnPaymentMethod } from './payment-method-rules';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recurring: RecurringService,
  ) {}

  async findAll(userId: string, filters: FilterTransactionsDto) {
    await this.recurring.materialize(userId);
    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.type) where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    return this.prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });
  }

  async create(userId: string, dto: CreateTransactionDto) {
    await this.resolveCategory(userId, dto.categoryId, dto.type);
    await assertOwnPaymentMethod(this.prisma, userId, dto.paymentMethodId);
    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        title: dto.title,
        amount: dto.amount,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : undefined,
        paymentMethodId: dto.paymentMethodId ?? null,
        reference: dto.reference?.trim() || null,
      },
      include: { category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const current = await this.findEditable(userId, id);
    const categoryId = dto.categoryId ?? current.categoryId;
    const type = dto.type ?? current.type;
    if (dto.categoryId || dto.type) {
      await this.resolveCategory(userId, categoryId, type);
    }
    await assertOwnPaymentMethod(this.prisma, userId, dto.paymentMethodId);
    return this.prisma.transaction.update({
      where: { id },
      data: {
        categoryId,
        type,
        title: dto.title,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
        // undefined keeps them; null clears them.
        paymentMethodId: dto.paymentMethodId,
        reference:
          dto.reference === undefined
            ? undefined
            : dto.reference?.trim() || null,
      },
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findEditable(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
    return { id };
  }

  /** A user's transaction that is not a goal contribution. */
  private async findEditable(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!transaction) {
      throw new NotFoundException('Movimiento no encontrado');
    }
    if (transaction.goalId) {
      throw new BadRequestException(
        'Los aportes de ahorro se gestionan desde Metas',
      );
    }
    return transaction;
  }

  private resolveCategory(
    userId: string,
    categoryId: string,
    type: TransactionType,
  ) {
    return resolveMovementCategory(this.prisma, userId, categoryId, type);
  }

  async getBalance(userId: string) {
    await this.recurring.materialize(userId);
    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalExpense = expenseAgg._sum.amount ?? 0;
    const balance = totalIncome - totalExpense;

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    };
  }

  async getAvailableBalance(userId: string): Promise<number> {
    const { balance } = await this.getBalance(userId);
    return balance;
  }
}
