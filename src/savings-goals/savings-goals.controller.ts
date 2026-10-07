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
import { SavingsGoalsService } from './savings-goals.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { AddFundsDto } from './dto/add-funds.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

@ApiTags('Savings Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('savings-goals')
export class SavingsGoalsController {
  constructor(private readonly savingsGoalsService: SavingsGoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Metas de ahorro con porcentaje de progreso' })
  @ApiResponse({ status: 200, description: 'Listado de metas' })
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.savingsGoalsService.findAll(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva meta de ahorro' })
  @ApiResponse({ status: 201, description: 'Meta creada' })
  create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateSavingsGoalDto,
  ) {
    return this.savingsGoalsService.create(user.sub, dto);
  }

  @Post(':id/add-funds')
  @ApiParam({ name: 'id', description: 'ID de la meta de ahorro' })
  @ApiOperation({
    summary: 'Aportar fondos a una meta (transacción ACID + egreso automático)',
  })
  @ApiResponse({ status: 200, description: 'Meta actualizada' })
  @ApiResponse({
    status: 400,
    description: 'Fondos insuficientes o error en transacción',
  })
  addFunds(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddFundsDto,
  ) {
    return this.savingsGoalsService.addFunds(user.sub, id, dto);
  }

  @Post(':id/withdraw')
  @ApiParam({ name: 'id', description: 'ID de la meta de ahorro' })
  @ApiOperation({
    summary: 'Retirar dinero de una meta (vuelve al balance)',
  })
  @ApiResponse({ status: 200, description: 'Meta actualizada' })
  @ApiResponse({ status: 400, description: 'Monto mayor a lo ahorrado' })
  withdraw(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddFundsDto,
  ) {
    return this.savingsGoalsService.withdraw(user.sub, id, dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'ID de la meta de ahorro' })
  @ApiOperation({
    summary: 'Editar nombre, monto objetivo o ícono de una meta',
  })
  @ApiResponse({ status: 200, description: 'Meta actualizada' })
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return this.savingsGoalsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID de la meta de ahorro' })
  @ApiOperation({
    summary: 'Eliminar una meta; lo ahorrado vuelve al balance disponible',
  })
  @ApiResponse({ status: 200, description: 'Meta eliminada' })
  remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.savingsGoalsService.remove(user.sub, id);
  }
}
