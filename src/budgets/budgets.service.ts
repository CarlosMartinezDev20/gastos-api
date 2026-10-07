import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { SAVINGS_CATEGORY_NAME } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { money } from '../common/money';

const round = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  // Budgets with what was spent in their category this month. [from] is the
  // start of the month in the user's time zone; the month ends a calendar
  // month later.
  async findAll(userId: string, from?: string) {
    const start = from ? new Date(from) : this.monthStart(new Date());
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    });
    if (budgets.length === 0) return [];

    const spending = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.EXPENSE,
        goalId: null,
        categoryId: { in: budgets.map((b) => b.categoryId) },
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    const spent = new Map(
      spending.map((s) => [s.categoryId, money(s._sum.amount)]),
    );

    return budgets.map((budget) => {
      const used = spent.get(budget.categoryId) ?? 0;
      const limit = money(budget.amount);
      return {
        id: budget.id,
        categoryId: budget.categoryId,
        category: budget.category,
        amount: limit,
        spent: used,
        remaining: money(limit - used),
        percent: limit > 0 ? round((used / limit) * 100) : 0,
      };
    });
  }

  // Creates or replaces the budget of an expense category the user can use.
  async set(userId: string, categoryId: string, amount: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ isDefault: true, userId: null }, { userId }],
      },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    if (category.type !== TransactionType.EXPENSE) {
      throw new BadRequestException(
        'Solo las categorías de gasto pueden tener presupuesto',
      );
    }
    if (category.isDefault && category.name === SAVINGS_CATEGORY_NAME) {
      throw new BadRequestException(
        'Los aportes de ahorro no llevan presupuesto',
      );
    }
    return this.prisma.budget.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      create: { userId, categoryId, amount },
      update: { amount },
    });
  }

  async remove(userId: string, categoryId: string) {
    const { count } = await this.prisma.budget.deleteMany({
      where: { userId, categoryId },
    });
    if (count === 0) throw new NotFoundException('Presupuesto no encontrado');
    return { message: 'Presupuesto eliminado' };
  }

  private monthStart(now: Date) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
