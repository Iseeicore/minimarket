import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
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
  @ApiOperation({ summary: 'Listar órdenes de compra paginadas (ADMIN o permiso COMPRAS→leer)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'leer')
  @ApiOperation({ summary: 'Obtener una orden de compra por ID (ADMIN o permiso COMPRAS→leer)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'crear')
  @ApiOperation({ summary: 'Crear nueva orden de compra (ADMIN o permiso COMPRAS→crear)' })
  create(@Body() dto: CreateOrdenCompraDto) {
    return this.service.create(dto);
  }

  @Post(':id/recibir')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'editar')
  @ApiOperation({ summary: 'Marcar orden como recibida — sube stock (ADMIN o permiso COMPRAS→editar)' })
  recibirOrden(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.recibirOrden(id, req.user.id);
  }

  @Post(':id/pagos')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'editar')
  @ApiOperation({ summary: 'Registrar pago de una orden de compra (ADMIN o permiso COMPRAS→editar)' })
  registrarPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePagoCompraDto,
  ) {
    return this.service.registrarPago(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.COMPRAS, 'eliminar')
  @ApiOperation({ summary: 'Eliminar orden pendiente sin recibir (ADMIN o permiso COMPRAS→eliminar)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
