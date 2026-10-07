import { ApiProperty } from '@nestjs/swagger';
import { RecurrenceFrequency, TransactionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
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
}
