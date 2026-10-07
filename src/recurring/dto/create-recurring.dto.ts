import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceFrequency, TransactionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRecurringDto {
  @ApiProperty({ example: 'Mesada' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @ApiProperty({ example: 150 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 'uuid-de-categoria' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ enum: RecurrenceFrequency })
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @ApiProperty({
    example: '2026-10-01T12:00:00.000Z',
    description: 'Fecha del primer movimiento',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    example: 'uuid-de-metodo-de-pago',
    description: 'Con qué se paga; se copia a cada movimiento. null lo quita.',
  })
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string | null;

  @ApiPropertyOptional({
    example: 'spotify',
    description: 'Servicio del catálogo si es una suscripción. null lo quita.',
  })
  @IsOptional()
  @Matches(/^[a-z0-9_]{1,40}$/)
  service?: string | null;
}
