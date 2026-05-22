import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
    summary:
      'Aportar fondos a una meta (transacción ACID + egreso automático)',
  })
  @ApiResponse({ status: 200, description: 'Meta actualizada' })
  @ApiResponse({
    status: 400,
    description: 'Fondos insuficientes o error en transacción',
  })
  addFunds(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: AddFundsDto,
  ) {
    return this.savingsGoalsService.addFunds(user.sub, id, dto);
  }
}
