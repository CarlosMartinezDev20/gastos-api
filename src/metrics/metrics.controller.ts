import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('category-expenses')
  @ApiOperation({
    summary: 'Gastos agrupados por categoría con totales y porcentajes',
  })
  @ApiResponse({ status: 200, description: 'Datos para gráfico de barras M3' })
  getCategoryExpenses(@CurrentUser() user: JwtPayloadUser) {
    return this.metricsService.getCategoryExpenses(user.sub);
  }

  @Get('savings-efficiency')
  @ApiOperation({
    summary: 'Porcentaje de ingresos destinados a ahorros',
  })
  @ApiResponse({ status: 200, description: 'Eficiencia de ahorro' })
  getSavingsEfficiency(@CurrentUser() user: JwtPayloadUser) {
    return this.metricsService.getSavingsEfficiency(user.sub);
  }
}
