import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true, userId: null }, { userId }],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        type: dto.type,
        isDefault: false,
        userId,
      },
    });
  }

  async findSavingsCategory() {
    return this.prisma.category.findFirst({
      where: { name: 'Ahorro', isDefault: true, userId: null },
    });
  }
}
