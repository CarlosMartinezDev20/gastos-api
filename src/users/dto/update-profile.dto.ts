import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccentColor, ThemeMode } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Daniela' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Tema oscuro (versiones anteriores de la app). Equivale a themeMode DARK/LIGHT.',
  })
  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @ApiPropertyOptional({ enum: ThemeMode, example: ThemeMode.SYSTEM })
  @IsOptional()
  @IsEnum(ThemeMode)
  themeMode?: ThemeMode;

  @ApiPropertyOptional({ enum: AccentColor, example: AccentColor.LIME })
  @IsOptional()
  @IsEnum(AccentColor)
  accent?: AccentColor;
}
