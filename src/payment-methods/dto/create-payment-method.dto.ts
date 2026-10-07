import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardBrand, PaymentMethodType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'Visa del banco' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @ApiProperty({ enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @ApiPropertyOptional({ enum: CardBrand, description: 'Solo tarjetas' })
  @IsOptional()
  @IsEnum(CardBrand)
  brand?: CardBrand | null;

  @ApiPropertyOptional({
    example: '4821',
    description: 'Últimos 4 dígitos (solo tarjetas). Nunca el número completo.',
  })
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'Escribe solo los últimos 4 dígitos' })
  last4?: string | null;

  @ApiPropertyOptional({ example: 'Banco Agrícola' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bank?: string | null;

  @ApiProperty({ example: 'ink', description: 'Color de la tarjeta en la app' })
  @Matches(/^[a-z]{2,20}$/)
  color: string;

  @ApiPropertyOptional({
    example: 1500,
    description: 'Solo tarjetas de crédito',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(10_000_000)
  creditLimit?: number | null;

  @ApiPropertyOptional({ example: 15, description: 'Día de corte (crédito)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  statementDay?: number | null;

  @ApiPropertyOptional({ example: 5, description: 'Día de pago (crédito)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number | null;
}
