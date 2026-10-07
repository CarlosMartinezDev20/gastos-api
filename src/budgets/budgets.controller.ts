import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
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
import { BudgetsService } from './budgets.service';
import { BudgetsQueryDto } from './dto/budgets-query.dto';
import { SetBudgetDto } from './dto/set-budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Presupuestos con lo gastado en el mes' })
  @ApiResponse({ status: 200, description: 'Listado de presupuestos' })
  findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: BudgetsQueryDto,
  ) {
    return this.budgetsService.findAll(user.sub, query.from);
  }

  @Put(':categoryId')
  @ApiParam({ name: 'categoryId', description: 'Categoría de gasto' })
  @ApiOperation({ summary: 'Crear o cambiar el presupuesto de una categoría' })
  @ApiResponse({ status: 200, description: 'Presupuesto guardado' })
  @ApiResponse({ status: 400, description: 'Categoría de ingreso o de ahorro' })
  set(
    @CurrentUser() user: JwtPayloadUser,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: SetBudgetDto,
  ) {
    return this.budgetsService.set(user.sub, categoryId, dto.amount);
  }

  @Delete(':categoryId')
  @ApiParam({ name: 'categoryId', description: 'Categoría de gasto' })
  @ApiOperation({ summary: 'Quitar el presupuesto de una categoría' })
  @ApiResponse({ status: 200, description: 'Presupuesto eliminado' })
  remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ) {
    return this.budgetsService.remove(user.sub, categoryId);
  }
}
