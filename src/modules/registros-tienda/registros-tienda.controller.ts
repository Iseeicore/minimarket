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
import { RegistrosTiendaService } from './registros-tienda.service';
import { CreateRegistroTiendaDto } from './dto/create-registro-tienda.dto';
import { FilterRegistroTiendaDto } from './dto/filter-registro-tienda.dto';

@ApiTags('registros-tienda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('registros-tienda')
export class RegistrosTiendaController {
  constructor(private service: RegistrosTiendaService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_TIENDA, 'leer')
  @ApiOperation({ summary: 'Listar registros activos (excluye devueltos)' })
  findAll(@Query() filters: FilterRegistroTiendaDto, @Request() req: any) {
    return this.service.findAll(filters, req.user.empresaId);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_TIENDA, 'leer')
  @ApiOperation({ summary: 'Obtener registro de tienda por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_TIENDA, 'crear')
  @ApiOperation({ summary: 'Crear registro manual de tienda (apunte libre del JEFE_VENTA)' })
  create(@Body() dto: CreateRegistroTiendaDto, @Request() req: any) {
    return this.service.create(dto, req.user.id, req.user.empresaId);
  }

  @Patch(':id/devolver')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.REGISTRO_TIENDA, 'editar')
  @ApiOperation({ summary: 'Marcar registro como devuelto — se excluye del listado y de la sincronización' })
  marcarDevuelto(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.marcarDevuelto(id, req.user.id, req.user.empresaId);
  }
}
