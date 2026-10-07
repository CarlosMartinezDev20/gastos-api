import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { SAVINGS_CATEGORY_NAME } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Checks the category is usable by the user for a manual (or recurring)
 * movement of `type`: a system or own category, not the reserved savings
 * one, and of the same type.
 */
export async function resolveMovementCategory(
  prisma: PrismaService,
  userId: string,
  categoryId: string,
  type: TransactionType,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ isDefault: true, userId: null }, { userId }],
    },
  });
  if (!category) {
    throw new NotFoundException('Categoría no encontrada');
  }
  if (
    category.isDefault &&
    category.userId === null &&
    category.name === SAVINGS_CATEGORY_NAME
  ) {
    throw new BadRequestException(
      'Los aportes de ahorro se registran desde Metas',
    );
  }
  if (category.type !== type) {
    throw new BadRequestException(
      'El tipo de transacción no coincide con la categoría',
    );
  }
  return category;
}
