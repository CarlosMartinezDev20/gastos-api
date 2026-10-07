import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSavingsGoalDto {
  @ApiProperty({ example: 'Nueva Laptop' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @ApiProperty({ example: 800 })
  @IsNumber()
  @IsPositive()
  targetAmount: number;

  @ApiProperty({ example: 'laptop_mac' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  icon: string;

  @ApiProperty({ example: 'bg-rose-500/10' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  bgColor: string;

  @ApiProperty({ example: 'text-rose-500' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  iconColor: string;
}
