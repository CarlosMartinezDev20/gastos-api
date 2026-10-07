import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** A payment method, when given, must be one of the user's own. */
export async function assertOwnPaymentMethod(
  prisma: PrismaService,
  userId: string,
  id?: string | null,
) {
  if (!id) return;
  const method = await prisma.paymentMethod.findFirst({
    where: { id, userId },
  });
  if (!method) throw new NotFoundException('Método de pago no encontrado');
}
