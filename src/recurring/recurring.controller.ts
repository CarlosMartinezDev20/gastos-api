import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { RecurringService } from './recurring.service';

@ApiTags('Recurring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Get()
  @ApiOperation({ summary: 'Movimientos recurrentes del usuario' })
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.recurringService.findAll(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un movimiento semanal o mensual' })
  @ApiResponse({ status: 201, description: 'Regla creada' })
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateRecurringDto) {
    return this.recurringService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'ID del movimiento recurrente' })
  @ApiOperation({ summary: 'Editar, pausar o reanudar' })
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringDto,
  ) {
    return this.recurringService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID del movimiento recurrente' })
  @ApiOperation({ summary: 'Eliminar (los movimientos ya creados se quedan)' })
  remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recurringService.remove(user.sub, id);
  }
}
