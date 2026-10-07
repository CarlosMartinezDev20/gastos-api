import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
} from 'class-validator';

export class CreateCardPaymentDto {
  @ApiProperty({ example: 120.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(10_000_000)
  amount: number;

  @ApiPropertyOptional({ example: '2026-10-07T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: 'uuid-de-la-cuenta-de-debito',
    description: 'De dónde salió el dinero (no otra tarjeta de crédito)',
  })
  @IsOptional()
  @IsUUID()
  fromMethodId?: string | null;
}
