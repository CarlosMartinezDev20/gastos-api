import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { AddFundsDto } from './dto/add-funds.dto';

@Injectable()
export class SavingsGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
  ) {}

  private mapWithProgress(goal: {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    icon: string;
    bgColor: string;
    iconColor: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const progressPercent =
      goal.targetAmount > 0
        ? Math.min(
            100,
            Math.round((goal.savedAmount / goal.targetAmount) * 10000) / 100,
          )
        : 0;
    return { ...goal, progressPercent };
  }

  async findAll(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return goals.map((g) => this.mapWithProgress(g));
  }

  async create(userId: string, dto: CreateSavingsGoalDto) {
    const goal = await this.prisma.savingsGoal.create({
      data: { ...dto, userId },
    });
    return this.mapWithProgress(goal);
  }

  async addFunds(userId: string, goalId: string, dto: AddFundsDto) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) {
      throw new NotFoundException('Meta de ahorro no encontrada');
    }

    const availableBalance =
      await this.transactionsService.getAvailableBalance(userId);
    if (dto.amount > availableBalance) {
      throw new BadRequestException(
        `Fondos insuficientes. Balance disponible: ${availableBalance.toFixed(2)}`,
      );
    }

    const savingsCategory =
      await this.categoriesService.findSavingsCategory();
    if (!savingsCategory) {
      throw new BadRequestException(
        'Categoría de ahorro del sistema no configurada',
      );
    }

    try {
      const [updatedGoal] = await this.prisma.$transaction([
        this.prisma.savingsGoal.update({
          where: { id: goalId },
          data: { savedAmount: { increment: dto.amount } },
        }),
        this.prisma.transaction.create({
          data: {
            userId,
            categoryId: savingsCategory.id,
            title: `Ahorro: ${goal.name}`,
            amount: dto.amount,
            type: TransactionType.EXPENSE,
          },
        }),
      ]);

      return this.mapWithProgress(updatedGoal);
    } catch {
      throw new BadRequestException(
        'No se pudo completar la operación de ahorro. Transacción revertida.',
      );
    }
  }
}
