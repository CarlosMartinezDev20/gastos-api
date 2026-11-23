import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
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

  @ApiPropertyOptional({
    example: '2027-06-30',
    description:
      'Día en que se quiere llegar a la meta (AAAA-MM-DD). null lo quita.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe ser AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'La fecha no es válida' })
  targetDate?: string | null;
}
