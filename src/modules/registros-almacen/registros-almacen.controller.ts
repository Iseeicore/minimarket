import {
  Body,
  Controller,
  DefaultValuePipe,
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
import { RegistrosAlmacenService } from './registros-almacen.service';
import { CreateRegistroAlmacenDto } from './dto/create-registro-almacen.dto';
import { FilterRegistroAlmacenDto } from './dto/filter-registro-almacen.dto';

@ApiTags('registros-almacen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('registros-almacen')
export class RegistrosAlmacenController {
  constructor(private service: RegistrosAlmacenService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_ALMACEN, 'leer')
  @ApiOperation({ summary: 'Listar registros activos (excluye devueltos)' })
  findAll(@Query() filters: FilterRegistroAlmacenDto, @Request() req: any) {
    return this.service.findAll(filters, req.user.empresaId);
  }

  @Get('por-venta/:ventaId')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_ALMACEN, 'leer')
  @ApiOperation({ summary: 'Registros vinculados a una Nota de Venta (para seleccionar cuál devolver)' })
  findByVenta(@Param('ventaId', ParseIntPipe) ventaId: number, @Request() req: any) {
    return this.service.findByVenta(ventaId, req.user.empresaId);
  }

  @Get('pendientes-tienda')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_ALMACEN, 'leer')
  @ApiOperation({ summary: 'Movimientos de almacén sin contrapartida en cuaderno de tienda (últimas N horas)' })
  pendientesTienda(
    @Query('almacenId', ParseIntPipe) almacenId: number,
    @Query('horas', new DefaultValuePipe(24), ParseIntPipe) horas: number,
    @Request() req: any,
  ) {
    return this.service.pendientesTienda(almacenId, horas, req.user.empresaId);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_ALMACEN, 'leer')
  @ApiOperation({ summary: 'Obtener registro de almacén por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_ALMACEN, 'crear')
  @ApiOperation({ summary: 'Crear registro manual (SALIDA, ENTRADA o TRANSFERENCIA)' })
  create(@Body() dto: CreateRegistroAlmacenDto, @Request() req: any) {
    return this.service.create(dto, req.user.id, req.user.empresaId);
  }

  @Patch(':id/devolver')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_ALMACEN, 'editar')
  @ApiOperation({ summary: 'Marcar registro como devuelto — se excluye del listado y de la sincronización' })
  marcarDevuelto(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.marcarDevuelto(id, req.user.id, req.user.empresaId);
  }
}
