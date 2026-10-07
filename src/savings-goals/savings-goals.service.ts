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
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

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

  async update(userId: string, id: string, dto: UpdateSavingsGoalDto) {
    await this.findOwned(userId, id);
    const [goal] = await this.prisma.$transaction([
      this.prisma.savingsGoal.update({ where: { id }, data: dto }),
      // Keep contribution and withdrawal titles in sync with the goal name.
      ...(dto.name
        ? [
            this.prisma.transaction.updateMany({
              where: { goalId: id, userId, amount: { gt: 0 } },
              data: { title: `Ahorro: ${dto.name}` },
            }),
            this.prisma.transaction.updateMany({
              where: { goalId: id, userId, amount: { lt: 0 } },
              data: { title: `Retiro: ${dto.name}` },
            }),
          ]
        : []),
    ]);
    return this.mapWithProgress(goal);
  }

  /** Deletes the goal and its contributions, so the saved money returns to the balance. */
  async remove(userId: string, id: string) {
    const goal = await this.findOwned(userId, id);
    await this.prisma.savingsGoal.delete({ where: { id } });
    return { id, returnedAmount: goal.savedAmount };
  }

  private async findOwned(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId },
    });
    if (!goal) {
      throw new NotFoundException('Meta de ahorro no encontrada');
    }
    return goal;
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

    const savingsCategory = await this.categoriesService.findSavingsCategory();
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
            goalId: goal.id,
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

  /**
   * Takes money out of a goal back to the balance: lowers savedAmount and
   * records a negative contribution (EXPENSE with a negative amount), so the
   * balance, the savings metrics and a later goal deletion all stay exact.
   */
  async withdraw(userId: string, goalId: string, dto: AddFundsDto) {
    const goal = await this.findOwned(userId, goalId);
    if (dto.amount > goal.savedAmount) {
      throw new BadRequestException(
        `Solo hay ${goal.savedAmount.toFixed(2)} ahorrados en esta meta`,
      );
    }
    const savingsCategory = await this.categoriesService.findSavingsCategory();
    if (!savingsCategory) {
      throw new BadRequestException(
        'Categoría de ahorro del sistema no configurada',
      );
    }
    try {
      const [updatedGoal] = await this.prisma.$transaction([
        // Fails (and rolls back) if a concurrent withdrawal emptied the goal.
        this.prisma.savingsGoal.update({
          where: { id: goalId, savedAmount: { gte: dto.amount } },
          data: { savedAmount: { decrement: dto.amount } },
        }),
        this.prisma.transaction.create({
          data: {
            userId,
            categoryId: savingsCategory.id,
            goalId: goal.id,
            title: `Retiro: ${goal.name}`,
            amount: -dto.amount,
            type: TransactionType.EXPENSE,
          },
        }),
      ]);
      return this.mapWithProgress(updatedGoal);
    } catch {
      throw new BadRequestException(
        'No se pudo retirar el dinero. Transacción revertida.',
      );
    }
  }
}
