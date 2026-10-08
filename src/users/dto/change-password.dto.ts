import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'daniela123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  currentPassword: string;

  @ApiProperty({ example: 'otraClave456', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  newPassword: string;
}
