import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map } from 'rxjs';

/** Decimals (money columns) as JSON numbers, as before they were exact:
 * the app's contract keeps `"amount": 12.5`, not `"12.5"`. */
export function decimalsToNumbers(value: unknown): unknown {
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(decimalsToNumbers);
  if (value instanceof Date || value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, decimalsToNumbers(item)]),
  );
}

@Injectable()
export class DecimalToNumberInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(decimalsToNumbers));
  }
}
