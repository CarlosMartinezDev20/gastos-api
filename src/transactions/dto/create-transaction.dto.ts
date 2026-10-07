import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: 'Almuerzo Facultad' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 8.5 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 'uuid-de-categoria' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: '2026-05-21T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    example: 'uuid-de-metodo-de-pago',
    description: 'Con qué se pagó (wallet). null lo quita al editar.',
  })
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string | null;

  @ApiPropertyOptional({
    example: '9F3A1C2B-0D4E-4F5A-8B6C-7D8E9F0A1B2C',
    description: 'Referencia libre, p. ej. el código de una factura escaneada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;
}
