import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Request, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ModuloApp } from '@prisma/client';
import { VariantesService } from './variantes.service';
import { CreateVarianteDto } from './dto/create-variante.dto';
import { UpdateVarianteDto } from './dto/update-variante.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';

@ApiTags('variantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('variantes')
export class VariantesController {
  constructor(private readonly service: VariantesService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar variantes de la empresa (para POS)' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Request() req: any, @Query('search') search?: string) {
    return this.service.findAll(req.user.empresaId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener variante por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VARIANTES, 'crear')
  @ApiOperation({ summary: 'Crear variante' })
  create(@Body() dto: CreateVarianteDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VARIANTES, 'editar')
  @ApiOperation({ summary: 'Actualizar variante' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVarianteDto, @Request() req: any) {
    return this.service.update(id, dto, req.user.empresaId);
  }

  @Delete(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VARIANTES, 'eliminar')
  @ApiOperation({ summary: 'Desactivar variante' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user.empresaId);
  }
}
