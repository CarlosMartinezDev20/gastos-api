import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ThemeMode } from '@prisma/client';
import { SupabaseAuthClient } from '../auth/supabase-auth.client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const profileSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  darkMode: true,
  themeMode: true,
  accent: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: SupabaseAuthClient,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: appearance(dto),
      select: profileSelect,
    });
  }

  /**
   * Deletes the account and, by cascade, everything in it. The user's
   * movements go first: they reference the user's own categories, which
   * the same cascade removes. Then the Supabase account: if that step
   * fails, the user can still sign in to an empty account and retry.
   */
  async deleteAccount(userId: string, password: string) {
    const { email } = await this.getProfile(userId);
    // 400, not 401: a 401 would sign the app out on a typo.
    if (!(await this.auth.checkPassword(email, password))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    await this.prisma.$transaction([
      this.prisma.transaction.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    await this.auth.deleteUser(userId);
  }
}

/**
 * Keeps darkMode (read by older app versions) and themeMode in step:
 * themeMode wins when both come; SYSTEM reads as light to older versions.
 */
export function appearance(dto: UpdateProfileDto): Prisma.UserUpdateInput {
  const data: Prisma.UserUpdateInput = { ...dto };
  if (dto.themeMode !== undefined) {
    data.darkMode = dto.themeMode === ThemeMode.DARK;
  } else if (dto.darkMode !== undefined) {
    data.themeMode = dto.darkMode ? ThemeMode.DARK : ThemeMode.LIGHT;
  }
  return data;
}
