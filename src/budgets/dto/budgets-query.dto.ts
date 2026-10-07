import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class BudgetsQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-01T05:00:00.000Z',
    description:
      'Inicio del mes del usuario (su zona horaria). Por defecto, el mes actual del servidor.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;
}
