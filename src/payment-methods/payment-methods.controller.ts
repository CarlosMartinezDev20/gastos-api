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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayloadUser,
} from '../common/decorators/current-user.decorator';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@ApiTags('Payment methods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly service: PaymentMethodsService) {}

  @Get()
  @ApiOperation({ summary: 'Tarjetas y métodos de pago del usuario' })
  @ApiResponse({ status: 200, description: 'Con transactionCount cada uno' })
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.service.findAll(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Agregar a la wallet' })
  @ApiResponse({ status: 201, description: 'Método creado' })
  @ApiResponse({ status: 409, description: 'Nombre repetido' })
  create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un método de pago' })
  @ApiResponse({ status: 200, description: 'Método actualizado' })
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Quitar de la wallet (sus movimientos quedan sin método)',
  })
  @ApiResponse({ status: 200, description: 'Método eliminado' })
  remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.sub, id);
  }
}
