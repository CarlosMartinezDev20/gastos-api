import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class JwtPayloadUser {
  sub: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
