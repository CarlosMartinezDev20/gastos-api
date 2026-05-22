import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class AddFundsDto {
  @ApiProperty({ example: 25.5, description: 'Monto a aportar a la meta' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
