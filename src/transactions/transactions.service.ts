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
import { money } from '../common/money';
import { TransactionPageDto } from './dto/transaction-page.dto';
import {
  SEARCH_FROM,
  SEARCH_TO,
  decodeCursor,
  encodeCursor,
  likePattern,
  normalizeSearch,
} from './page-cursor';

/** An instant for raw SQL: `date` is timestamptz, so an explicit ISO
 * timestamp compares exactly whatever the session's time zone is. */
const utc = (date: Date | string) =>
  Prisma.sql`(${new Date(date).toISOString()}::timestamptz)`;

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

  /**
   * One page of the history, newest first, with the filters of the app's
   * Historial. The first page (no cursor) also brings the totals of
   * everything that matches, since the app no longer has every movement.
   */
  async findPage(userId: string, query: TransactionPageDto) {
    await this.recurring.materialize(userId);
    const limit = query.limit ?? 50;
    const where: Prisma.Sql[] = [Prisma.sql`t."userId" = ${userId}`];
    if (query.type) {
      where.push(Prisma.sql`t."type" = ${query.type}::"TransactionType"`);
    }
    if (query.categoryId) {
      where.push(Prisma.sql`t."categoryId" = ${query.categoryId}`);
    }
    if (query.from) where.push(Prisma.sql`t."date" >= ${utc(query.from)}`);
    if (query.to) where.push(Prisma.sql`t."date" <= ${utc(query.to)}`);
    const search = normalizeSearch(query.q ?? '');
    if (search) {
      where.push(
        Prisma.sql`translate(lower(t."title" || ' ' || c."name"), ${SEARCH_FROM}, ${SEARCH_TO}) LIKE ${likePattern(search)} ESCAPE '\\'`,
      );
    }
    const filters = Prisma.join(where, ' AND ');
    const from = Prisma.sql`FROM "Transaction" t JOIN "Category" c ON c."id" = t."categoryId"`;

    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const pageWhere = after
      ? Prisma.sql`${filters} AND (t."date", t."id") < (${utc(after.date)}, ${after.id})`
      : filters;
    const [rows, summary] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT t."id" ${from} WHERE ${pageWhere}
        ORDER BY t."date" DESC, t."id" DESC LIMIT ${limit + 1}`,
      after
        ? null
        : this.prisma.$queryRaw<
            { count: number; income: Prisma.Decimal; expense: Prisma.Decimal }[]
          >`
            SELECT COUNT(*)::int AS "count",
              COALESCE(SUM(t."amount") FILTER (WHERE t."type" = 'INCOME'), 0) AS "income",
              COALESCE(SUM(t."amount") FILTER (WHERE t."type" = 'EXPENSE'), 0) AS "expense"
            ${from} WHERE ${filters}`,
    ]);

    const ids = rows.slice(0, limit).map((r) => r.id);
    const found = await this.prisma.transaction.findMany({
      where: { id: { in: ids } },
      include: { category: true },
    });
    const byId = new Map(found.map((t) => [t.id, t]));
    const items = ids.flatMap((id) => byId.get(id) ?? []);
    const last = items.at(-1);
    return {
      items,
      nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
      summary: summary && {
        count: summary[0].count,
        income: money(summary[0].income),
        expense: money(summary[0].expense),
      },
    };
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

    // Postgres sums the DECIMAL amounts exactly; cents from here on.
    const totalIncome = money(incomeAgg._sum.amount);
    const totalExpense = money(expenseAgg._sum.amount);
    return {
      totalIncome,
      totalExpense,
      balance: money(totalIncome - totalExpense),
    };
  }

  async getAvailableBalance(userId: string): Promise<number> {
    const { balance } = await this.getBalance(userId);
    return balance;
  }
}
