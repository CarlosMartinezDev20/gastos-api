import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SAVINGS_CATEGORY_NAME } from '../categories/categories.service';
import { money } from '../common/money';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategoryExpenses(userId: string) {
    const expenses = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      // Goal contributions are savings, not spending.
      where: { userId, type: TransactionType.EXPENSE, goalId: null },
      _sum: { amount: true },
    });

    const categoryIds = expenses.map((e) => e.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const items = expenses.map((e) => ({
      categoryId: e.categoryId,
      categoryName: categoryMap.get(e.categoryId)?.name ?? 'Desconocida',
      icon: categoryMap.get(e.categoryId)?.icon ?? 'help',
      total: money(e._sum.amount),
    }));

    const grandTotal = items.reduce((sum, i) => sum + i.total, 0);

    return items
      .map((item) => ({
        ...item,
        percentage:
          grandTotal > 0
            ? Math.round((item.total / grandTotal) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async getSavingsEfficiency(userId: string) {
    const savingsCategory = await this.prisma.category.findFirst({
      where: { name: SAVINGS_CATEGORY_NAME, isDefault: true, userId: null },
    });
    const [incomeAgg, savingsExpenses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          categoryId: savingsCategory?.id ?? '',
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = money(incomeAgg._sum.amount);
    const totalSaved = money(savingsExpenses._sum.amount);
    const efficiencyPercent =
      totalIncome > 0
        ? Math.round((totalSaved / totalIncome) * 10000) / 100
        : 0;

    return {
      totalIncome,
      totalSaved,
      efficiencyPercent,
    };
  }
}
