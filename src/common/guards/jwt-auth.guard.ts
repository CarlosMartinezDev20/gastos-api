import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import { JwtPayloadUser } from '../decorators/current-user.decorator';

/** Requires a Supabase access token (`Authorization: Bearer …`) and puts
 * its user in `request.user` for `@CurrentUser()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayloadUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Inicia sesión para continuar');
    }
    request.user = await this.auth.authenticate(token);
    return true;
  }
}
