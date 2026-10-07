import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max } from 'class-validator';

export class SetBudgetDto {
  @ApiProperty({ example: 120, description: 'Límite mensual de gasto' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000)
  amount: number;
}
