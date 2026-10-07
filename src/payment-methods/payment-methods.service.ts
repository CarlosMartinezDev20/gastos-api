import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentMethodType } from '@prisma/client';
import { money } from '../common/money';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardPaymentDto } from './dto/create-card-payment.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

const CARD_TYPES: PaymentMethodType[] = [
  PaymentMethodType.CREDIT_CARD,
  PaymentMethodType.DEBIT_CARD,
];

// Amounts as numbers (cents); Prisma stores them as DECIMAL.
type Fields = Omit<
  PaymentMethod,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'creditLimit'
> & { creditLimit: number | null };

/**
 * Keeps only the fields that make sense for the type: brand and last
 * digits for cards, the bank for cards and digital wallets, and the limit
 * and statement days for credit cards.
 */
export function normalizePaymentMethod(fields: Fields): Fields {
  const card = CARD_TYPES.includes(fields.type);
  const credit = fields.type === PaymentMethodType.CREDIT_CARD;
  return {
    name: fields.name.trim(),
    type: fields.type,
    color: fields.color,
    brand: card ? fields.brand : null,
    last4: card ? fields.last4 : null,
    bank:
      fields.type === PaymentMethodType.CASH
        ? null
        : fields.bank?.trim() || null,
    creditLimit: credit ? fields.creditLimit : null,
    statementDay: credit ? fields.statementDay : null,
    dueDay: credit ? fields.dueDay : null,
  };
}

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Each method with its movement count and, for credit cards, the total
   * paid to it (what's owed = its expenses − that). */
  async findAll(userId: string) {
    const [methods, paid] = await Promise.all([
      this.prisma.paymentMethod.findMany({
        where: { userId },
        include: { _count: { select: { transactions: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.cardPayment.groupBy({
        by: ['paymentMethodId'],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);
    const paidBy = new Map(
      paid.map((p) => [p.paymentMethodId, money(p._sum.amount)]),
    );
    return methods.map(({ _count, ...method }) => ({
      ...method,
      transactionCount: _count.transactions,
      paidTotal: paidBy.get(method.id) ?? 0,
    }));
  }

  async listPayments(userId: string, methodId: string) {
    await this.findOwn(userId, methodId);
    return this.prisma.cardPayment.findMany({
      where: { userId, paymentMethodId: methodId },
      orderBy: { date: 'desc' },
    });
  }

  /** A payment to a credit card: lowers what's owed, not the balance. */
  async addPayment(
    userId: string,
    methodId: string,
    dto: CreateCardPaymentDto,
  ) {
    const card = await this.findOwn(userId, methodId);
    if (card.type !== PaymentMethodType.CREDIT_CARD) {
      throw new BadRequestException(
        'Solo las tarjetas de crédito reciben pagos',
      );
    }
    if (dto.fromMethodId) {
      const from = await this.findOwn(userId, dto.fromMethodId);
      if (from.type === PaymentMethodType.CREDIT_CARD) {
        throw new BadRequestException(
          'Paga desde efectivo, débito o una billetera digital',
        );
      }
    }
    return this.prisma.cardPayment.create({
      data: {
        userId,
        paymentMethodId: methodId,
        fromMethodId: dto.fromMethodId ?? null,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async removePayment(userId: string, paymentId: string) {
    const payment = await this.prisma.cardPayment.findFirst({
      where: { id: paymentId, userId },
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    await this.prisma.cardPayment.delete({ where: { id: paymentId } });
    return { id: paymentId };
  }

  async create(userId: string, dto: CreatePaymentMethodDto) {
    const data = normalizePaymentMethod({
      name: dto.name,
      type: dto.type,
      color: dto.color,
      brand: dto.brand ?? null,
      last4: dto.last4 ?? null,
      bank: dto.bank ?? null,
      creditLimit: dto.creditLimit ?? null,
      statementDay: dto.statementDay ?? null,
      dueDay: dto.dueDay ?? null,
    });
    await this.assertUniqueName(userId, data.name);
    return this.prisma.paymentMethod.create({ data: { ...data, userId } });
  }

  async update(userId: string, id: string, dto: UpdatePaymentMethodDto) {
    const current = await this.findOwn(userId, id);
    // undefined keeps the current value; null clears it.
    const keep = <T>(value: T | undefined, current: T): T =>
      value === undefined ? current : value;
    const data = normalizePaymentMethod({
      name: keep(dto.name, current.name),
      type: keep(dto.type, current.type),
      color: keep(dto.color, current.color),
      brand: keep(dto.brand, current.brand),
      last4: keep(dto.last4, current.last4),
      bank: keep(dto.bank, current.bank),
      creditLimit: keep(
        dto.creditLimit,
        current.creditLimit === null ? null : money(current.creditLimit),
      ),
      statementDay: keep(dto.statementDay, current.statementDay),
      dueDay: keep(dto.dueDay, current.dueDay),
    });
    if (data.name.toLowerCase() !== current.name.toLowerCase()) {
      await this.assertUniqueName(userId, data.name, id);
    }
    return this.prisma.paymentMethod.update({ where: { id }, data });
  }

  /** Movements paid with it keep existing, without a payment method. */
  async remove(userId: string, id: string) {
    await this.findOwn(userId, id);
    await this.prisma.paymentMethod.delete({ where: { id } });
    return { id };
  }

  async findOwn(userId: string, id: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, userId },
    });
    if (!method) throw new NotFoundException('Método de pago no encontrado');
    return method;
  }

  private async assertUniqueName(
    userId: string,
    name: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.paymentMethod.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(`Ya tienes "${existing.name}" en tu wallet`);
    }
  }
}
