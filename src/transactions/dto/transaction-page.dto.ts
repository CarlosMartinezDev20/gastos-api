import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FilterTransactionsDto } from './filter-transactions.dto';
import { CURSOR_PATTERN } from '../page-cursor';

export class TransactionPageDto extends FilterTransactionsDto {
  @ApiPropertyOptional({
    description: 'Busca en el título y la categoría, sin importar tildes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: '`nextCursor` de la página anterior',
  })
  @IsOptional()
  @Matches(CURSOR_PATTERN, { message: 'Cursor inválido' })
  cursor?: string;
}
