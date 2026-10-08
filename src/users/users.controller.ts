import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil con preferencias darkMode' })
  getProfile(@CurrentUser() user: JwtPayloadUser) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Actualizar perfil o tema visual' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  updateProfile(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Patch('password')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({
    summary: 'Cambiar contraseña (cierra la sesión en otros dispositivos)',
  })
  @ApiResponse({ status: 200, description: 'Nuevo token para este equipo' })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta' })
  changePassword(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.sub, dto);
  }

  @Delete('profile')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Eliminar la cuenta y todos sus datos' })
  @ApiResponse({ status: 204, description: 'Cuenta eliminada' })
  @ApiResponse({ status: 400, description: 'Contraseña incorrecta' })
  async deleteAccount(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.usersService.deleteAccount(user.sub, dto.password);
  }
}
