import { Injectable, NotFoundException } from '@nestjs/common';
import { RecurrenceFrequency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveMovementCategory } from '../transactions/category-rules';
import { assertOwnPaymentMethod } from '../transactions/payment-method-rules';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';

/** Occurrences created per rule in one pass, so a long-paused rule can't flood. */
const MAX_CATCH_UP = 60;

/**
 * The date after `date`: a week later, or the same day next month (the
 * anchor day, clamped to short months: Jan 31 → Feb 28 → Mar 31).
 */
export function nextOccurrence(
  date: Date,
  frequency: RecurrenceFrequency,
  anchorDay: number,
): Date {
  const next = new Date(date);
  if (frequency === RecurrenceFrequency.WEEKLY) {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  const year = next.getUTCFullYear();
  const month = next.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  next.setUTCDate(1);
  next.setUTCFullYear(year, month, Math.min(anchorDay, lastDay));
  return next;
}

@Injectable()
export class RecurringService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.recurringTransaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: [{ active: 'desc' }, { nextDate: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateRecurringDto) {
    await resolveMovementCategory(
      this.prisma,
      userId,
      dto.categoryId,
      dto.type,
    );
    await assertOwnPaymentMethod(this.prisma, userId, dto.paymentMethodId);
    const start = new Date(dto.startDate);
    return this.prisma.recurringTransaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        title: dto.title.trim(),
        amount: dto.amount,
        type: dto.type,
        frequency: dto.frequency,
        anchorDay: start.getUTCDate(),
        nextDate: start,
        paymentMethodId: dto.paymentMethodId ?? null,
      },
      include: { category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateRecurringDto) {
    const rule = await this.findOwn(userId, id);
    await assertOwnPaymentMethod(this.prisma, userId, dto.paymentMethodId);
    // Resuming a paused rule continues from today, without back-filling
    // the time it was paused.
    let nextDate = rule.nextDate;
    if (dto.active && !rule.active) {
      const now = new Date();
      while (nextDate < now) {
        nextDate = nextOccurrence(
          nextDate,
          dto.frequency ?? rule.frequency,
          rule.anchorDay,
        );
      }
    }
    return this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        amount: dto.amount,
        frequency: dto.frequency,
        active: dto.active,
        nextDate,
        // undefined keeps it; null clears it.
        paymentMethodId: dto.paymentMethodId,
      },
      include: { category: true },
    });
  }

  /** Deletes the rule; the movements it already created stay. */
  async remove(userId: string, id: string) {
    await this.findOwn(userId, id);
    await this.prisma.recurringTransaction.delete({ where: { id } });
    return { id };
  }

  /**
   * Creates the transactions of every active rule that is due. Each
   * occurrence advances `nextDate` with a compare-and-set, so concurrent
   * requests never create the same occurrence twice.
   */
  async materialize(userId: string, now = new Date()) {
    const due = await this.prisma.recurringTransaction.findMany({
      where: { userId, active: true, nextDate: { lte: now } },
    });
    for (const rule of due) {
      let current = rule.nextDate;
      for (let i = 0; i < MAX_CATCH_UP && current <= now; i++) {
        const next = nextOccurrence(current, rule.frequency, rule.anchorDay);
        const created = await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.recurringTransaction.updateMany({
            where: { id: rule.id, nextDate: current },
            data: { nextDate: next },
          });
          if (claimed.count === 0) return false;
          await tx.transaction.create({
            data: {
              userId,
              categoryId: rule.categoryId,
              recurringId: rule.id,
              title: rule.title,
              amount: rule.amount,
              type: rule.type,
              date: current,
              paymentMethodId: rule.paymentMethodId,
            },
          });
          return true;
        });
        if (!created) break;
        current = next;
      }
    }
  }

  private async findOwn(userId: string, id: string) {
    const rule = await this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });
    if (!rule)
      throw new NotFoundException('Movimiento recurrente no encontrado');
    return rule;
  }
}
