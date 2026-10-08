import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { jwtSecret } from '../jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(configService),
    });
  }

  /**
   * Rejects tokens of deleted accounts and those signed before the last
   * password change (tokens from before `ver` existed count as 0).
   */
  async validate(payload: {
    sub?: string;
    email?: string;
    ver?: number;
  }): Promise<JwtPayloadUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token inválido');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });
    if (!user || user.tokenVersion !== (payload.ver ?? 0)) {
      throw new UnauthorizedException(
        'Tu sesión expiró, inicia sesión de nuevo',
      );
    }
    return { sub: payload.sub, email: payload.email };
  }
}
