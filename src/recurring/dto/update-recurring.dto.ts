import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceFrequency } from '@prisma/client';
import {
  IsBoolean,
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

export class UpdateRecurringDto {
  @ApiPropertyOptional({ example: 'Mesada' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ enum: RecurrenceFrequency })
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @ApiPropertyOptional({ description: 'Pausar (false) o reanudar (true)' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

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
