import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, filters: FilterTransactionsDto) {
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
    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        OR: [{ isDefault: true, userId: null }, { userId }],
      },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    if (category.type !== dto.type) {
      throw new BadRequestException(
        'El tipo de transacción no coincide con la categoría',
      );
    }

    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        title: dto.title,
        amount: dto.amount,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include: { category: true },
    });
  }

  async getBalance(userId: string) {
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
