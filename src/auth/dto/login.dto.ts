import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'daniela@universidad.edu' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'daniela123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
