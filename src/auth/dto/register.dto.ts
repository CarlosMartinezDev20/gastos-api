import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Daniela' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'daniela@universidad.edu' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'daniela123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
