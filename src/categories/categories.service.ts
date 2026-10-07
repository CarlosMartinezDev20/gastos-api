import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export const SAVINGS_CATEGORY_NAME = 'Ahorro';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // The system savings category is reserved for goal contributions, so it is
  // hidden from the list the user picks from. Each category carries how many
  // of the user's movements use it.
  async findAllForUser(userId: string) {
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true, userId: null }, { userId }],
        NOT: { name: SAVINGS_CATEGORY_NAME, isDefault: true, userId: null },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { transactions: { where: { userId } } } },
      },
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      transactionCount: _count.transactions,
    }));
  }

  async create(userId: string, dto: CreateCategoryDto) {
    const name = dto.name.trim();
    await this.assertNameFree(userId, name, dto.type);
    const category = await this.prisma.category.create({
      data: { name, icon: dto.icon, type: dto.type, isDefault: false, userId },
    });
    return { ...category, transactionCount: 0 };
  }

  // Only the user's own categories can change. The type stays fixed once
  // movements use the category, since a movement's type must match it.
  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOwn(userId, id);
    const count = await this.prisma.transaction.count({
      where: { categoryId: id, userId },
    });
    const type = dto.type ?? category.type;
    if (type !== category.type && count > 0) {
      throw new ConflictException(
        'No puedes cambiar el tipo de una categoría con movimientos',
      );
    }
    const name = dto.name?.trim() ?? category.name;
    if (name !== category.name || type !== category.type) {
      await this.assertNameFree(userId, name, type, id);
    }
    const updated = await this.prisma.category.update({
      where: { id },
      data: { name, icon: dto.icon ?? category.icon, type },
    });
    return { ...updated, transactionCount: count };
  }

  async remove(userId: string, id: string) {
    await this.findOwn(userId, id);
    const count = await this.prisma.transaction.count({
      where: { categoryId: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `La categoría tiene ${count} ${count === 1 ? 'movimiento' : 'movimientos'}. Muévelos a otra categoría o elimínalos primero.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Categoría eliminada' };
  }

  async findSavingsCategory() {
    return this.prisma.category.findFirst({
      where: { name: SAVINGS_CATEGORY_NAME, isDefault: true, userId: null },
    });
  }

  private async findOwn(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId, isDefault: false },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  // Names are unique per type among the system and the user's categories.
  private async assertNameFree(
    userId: string,
    name: string,
    type: TransactionType,
    exceptId?: string,
  ) {
    const existing = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        type,
        OR: [{ isDefault: true, userId: null }, { userId }],
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una categoría "${existing.name}"`);
    }
  }
}
