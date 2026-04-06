import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuloApp } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';
import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';

@ApiTags('devoluciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devoluciones')
export class DevolucionesController {
  constructor(private service: DevolucionesService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.DEVOLUCIONES, 'leer')
  @ApiOperation({ summary: 'Listar devoluciones paginadas' })
  findAll(@Query() pagination: PaginationDto, @Request() req: any) {
    return this.service.findAll(pagination, req.user.empresaId);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.DEVOLUCIONES, 'leer')
  @ApiOperation({ summary: 'Obtener devolución por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.DEVOLUCIONES, 'crear')
  @ApiOperation({ summary: 'Procesar devolución de venta (revierte stock y caja)' })
  create(@Body() dto: CreateDevolucionDto, @Request() req: any) {
    return this.service.create(dto, req.user.id, req.user.empresaId);
  }
}
