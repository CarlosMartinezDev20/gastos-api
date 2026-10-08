import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Contraseña actual, para confirmar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
