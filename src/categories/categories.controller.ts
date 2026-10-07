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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Categorías del sistema y personalizadas del usuario',
  })
  @ApiResponse({ status: 200, description: 'Listado de categorías' })
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.categoriesService.findAllForUser(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Crear categoría personalizada' })
  @ApiResponse({ status: 201, description: 'Categoría creada' })
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'ID de la categoría' })
  @ApiOperation({ summary: 'Editar una categoría personalizada' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada' })
  @ApiResponse({ status: 404, description: 'No existe o es del sistema' })
  @ApiResponse({ status: 409, description: 'Nombre repetido o tipo en uso' })
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID de la categoría' })
  @ApiOperation({
    summary: 'Eliminar una categoría personalizada sin movimientos',
  })
  @ApiResponse({ status: 200, description: 'Categoría eliminada' })
  @ApiResponse({ status: 404, description: 'No existe o es del sistema' })
  @ApiResponse({ status: 409, description: 'Tiene movimientos' })
  remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.remove(user.sub, id);
  }
}
