import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuloApp } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';
import { ComprasService } from './compras.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { CreatePagoCompraDto } from './dto/create-pago-compra.dto';

@ApiTags('compras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compras')
export class ComprasController {
  constructor(private service: ComprasService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'leer')
  @ApiOperation({ summary: 'Listar órdenes de compra paginadas' })
  findAll(@Query() pagination: PaginationDto, @Request() req: any) {
    return this.service.findAll(pagination, req.user.empresaId);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'leer')
  @ApiOperation({ summary: 'Obtener orden de compra por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'crear')
  @ApiOperation({ summary: 'Crear nueva orden de compra' })
  create(@Body() dto: CreateOrdenCompraDto, @Request() req: any) {
    return this.service.create(dto, req.user.empresaId);
  }

  @Post(':id/recibir')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'editar')
  @ApiOperation({ summary: 'Marcar orden como recibida — sube stock' })
  recibirOrden(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.recibirOrden(id, req.user.id, req.user.empresaId);
  }

  @Post(':id/pagos')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'editar')
  @ApiOperation({ summary: 'Registrar pago de una orden de compra' })
  registrarPago(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePagoCompraDto, @Request() req: any) {
    return this.service.registrarPago(id, dto, req.user.empresaId);
  }

  @Delete(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'eliminar')
  @ApiOperation({ summary: 'Eliminar orden pendiente sin recibir' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user.empresaId);
  }
}
