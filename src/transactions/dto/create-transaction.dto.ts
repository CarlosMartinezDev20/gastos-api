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
}
