import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const profileSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  darkMode: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
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
      data: dto,
      select: profileSelect,
    });
  }

  /**
   * Changes the password and bumps `tokenVersion`, which signs out every
   * other device; returns a fresh token for this one.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    await this.checkPassword(userId, dto.currentPassword);
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: await bcrypt.hash(dto.newPassword, 10),
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, tokenVersion: true },
    });
    return { accessToken: this.auth.signToken(user) };
  }

  /**
   * Deletes the account and, by cascade, everything in it. The user's
   * movements go first: they reference the user's own categories, which
   * the same cascade removes.
   */
  async deleteAccount(userId: string, password: string) {
    await this.checkPassword(userId, password);
    await this.prisma.$transaction([
      this.prisma.transaction.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }

  // 400, not 401: a 401 would sign the app out on a typo.
  private async checkPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
  }
}
