import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        darkMode: true,
        createdAt: true,
      },
    });

    const accessToken = this.signToken(user);
    return { user, accessToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = this.signToken(user);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        darkMode: user.darkMode,
        createdAt: user.createdAt,
      },
      accessToken,
    };
  }

  /** A token for [user]; `ver` ties it to the current password. */
  signToken(user: { id: string; email: string; tokenVersion?: number }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      ver: user.tokenVersion ?? 0,
    });
  }
}
