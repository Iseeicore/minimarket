import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ModuloApp } from '@prisma/client';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';

@ApiTags('productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos con variantes' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto con variantes' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.PRODUCTOS, 'crear')
  @ApiOperation({ summary: 'Crear producto (ADMIN o permiso PRODUCTOS→crear)' })
  create(@Body() dto: CreateProductoDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.PRODUCTOS, 'editar')
  @ApiOperation({ summary: 'Actualizar producto (ADMIN o permiso PRODUCTOS→editar)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.PRODUCTOS, 'eliminar')
  @ApiOperation({ summary: 'Eliminar producto (ADMIN o permiso PRODUCTOS→eliminar)' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
