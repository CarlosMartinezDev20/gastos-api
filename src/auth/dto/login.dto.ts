import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'daniela@universidad.edu' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'daniela123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
