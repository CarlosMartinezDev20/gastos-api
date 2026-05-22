import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

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
  create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.sub, dto);
  }
}
