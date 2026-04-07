import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuloApp } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';
import { OrdenesSalidaService } from './ordenes-salida.service';
import { CreateOrdenSalidaDto } from './dto/create-orden-salida.dto';
import { FilterOrdenSalidaDto } from './dto/filter-orden-salida.dto';

@ApiTags('ordenes-salida')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ordenes-salida')
export class OrdenesSalidaController {
  constructor(private service: OrdenesSalidaService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.ORDENES_SALIDA, 'leer')
  @ApiOperation({ summary: 'Listar ordenes de salida paginadas con filtros' })
  findAll(@Query() filters: FilterOrdenSalidaDto, @Request() req: any) {
    return this.service.findAll(filters, req.user.empresaId);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.ORDENES_SALIDA, 'leer')
  @ApiOperation({ summary: 'Obtener orden de salida por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.ORDENES_SALIDA, 'crear')
  @ApiOperation({ summary: 'Crear orden de salida — mueve stock de almacen a tienda' })
  create(@Body() dto: CreateOrdenSalidaDto, @Request() req: any) {
    return this.service.create(dto, req.user.id, req.user.empresaId);
  }

  @Patch(':id/completar')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.ORDENES_SALIDA, 'editar')
  @ApiOperation({ summary: 'Marcar orden como completada — almacenero confirma despacho' })
  completar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.completar(id, req.user.empresaId);
  }

  @Patch(':id/cancelar')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.ORDENES_SALIDA, 'editar')
  @ApiOperation({ summary: 'Cancelar orden pendiente' })
  cancelar(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.cancelar(id, req.user.empresaId);
  }
}
