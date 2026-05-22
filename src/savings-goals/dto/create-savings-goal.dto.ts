import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateSavingsGoalDto {
  @ApiProperty({ example: 'Nueva Laptop' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 800 })
  @IsNumber()
  @IsPositive()
  targetAmount: number;

  @ApiProperty({ example: 'laptop_mac' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ example: 'bg-rose-500/10' })
  @IsString()
  @IsNotEmpty()
  bgColor: string;

  @ApiProperty({ example: 'text-rose-500' })
  @IsString()
  @IsNotEmpty()
  iconColor: string;
}
