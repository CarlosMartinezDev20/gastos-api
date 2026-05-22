import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategoryExpenses(userId: string) {
    const expenses = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: TransactionType.EXPENSE },
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
      total: e._sum.amount ?? 0,
    }));

    const grandTotal = items.reduce((sum, i) => sum + i.total, 0);

    return items
      .map((item) => ({
        ...item,
        total: Math.round(item.total * 100) / 100,
        percentage:
          grandTotal > 0
            ? Math.round((item.total / grandTotal) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  async getSavingsEfficiency(userId: string) {
    const [incomeAgg, savingsExpenses] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          title: { startsWith: 'Ahorro:' },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalSaved = savingsExpenses._sum.amount ?? 0;
    const efficiencyPercent =
      totalIncome > 0
        ? Math.round((totalSaved / totalIncome) * 10000) / 100
        : 0;

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalSaved: Math.round(totalSaved * 100) / 100,
      efficiencyPercent,
    };
  }
}
