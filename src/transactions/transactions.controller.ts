import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listado de transacciones con filtros opcionales',
  })
  @ApiResponse({ status: 200, description: 'Transacciones del usuario' })
  findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query() filters: FilterTransactionsDto,
  ) {
    return this.transactionsService.findAll(user.sub, filters);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Resumen financiero: ingresos, egresos y balance' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        totalIncome: 150,
        totalExpense: 60.74,
        balance: 89.26,
      },
    },
  })
  getBalance(@CurrentUser() user: JwtPayloadUser) {
    return this.transactionsService.getBalance(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar ingreso o egreso' })
  @ApiResponse({ status: 201, description: 'Transacción creada' })
  create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'ID del movimiento' })
  @ApiOperation({ summary: 'Editar un ingreso o gasto' })
  @ApiResponse({ status: 200, description: 'Movimiento actualizado' })
  @ApiResponse({
    status: 400,
    description: 'Aporte de ahorro o datos inválidos',
  })
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID del movimiento' })
  @ApiOperation({ summary: 'Eliminar un ingreso o gasto' })
  @ApiResponse({ status: 200, description: 'Movimiento eliminado' })
  remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactionsService.remove(user.sub, id);
  }
}
