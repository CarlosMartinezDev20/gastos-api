import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAuthClient } from './supabase-auth.client';
import {
  InvalidTokenError,
  SupabaseIdentity,
  SupabaseJwtVerifier,
} from './supabase-jwt.verifier';

/**
 * Turns a Supabase access token into the API's user. Accounts live in
 * Supabase Auth; the `User` row (same id) holds the profile and owns the
 * data, and is created the first time a new account calls the API.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly verifier: SupabaseJwtVerifier,
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAuthClient,
  ) {}

  async authenticate(token: string): Promise<JwtPayloadUser> {
    let identity: SupabaseIdentity;
    try {
      identity = await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException(
          'Tu sesión expiró, inicia sesión de nuevo',
        );
      }
      throw error;
    }
    await this.ensureProfile(identity);
    return { sub: identity.sub, email: identity.email };
  }

  private async ensureProfile({ sub, email, name }: SupabaseIdentity) {
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { email: true },
    });
    // A new profile only for a live account: not for the still-valid token
    // of an account that was just deleted.
    if (!user && !(await this.supabase.userExists(sub))) {
      throw new UnauthorizedException('Esta cuenta ya no existe');
    }
    try {
      if (!user) {
        await this.prisma.user.create({
          data: { id: sub, email, name: name ?? email.split('@')[0] },
        });
      } else if (user.email !== email) {
        // The email was changed in Supabase Auth.
        await this.prisma.user.update({ where: { id: sub }, data: { email } });
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Two first requests at once: the other one created it.
        if (await this.prisma.user.findUnique({ where: { id: sub } })) return;
        // Another profile (a deleted Supabase account) still has the email.
        throw new ConflictException('El correo ya está registrado');
      }
      throw error;
    }
  }
}
