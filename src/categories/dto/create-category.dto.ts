import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Gimnasio' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'fitness_center', description: 'Material Symbols icon name' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type: TransactionType;
}
