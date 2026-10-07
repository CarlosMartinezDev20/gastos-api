import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Gimnasio' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @ApiProperty({
    example: 'fitness_center',
    description: 'Material Symbols icon name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  icon: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type: TransactionType;
}
