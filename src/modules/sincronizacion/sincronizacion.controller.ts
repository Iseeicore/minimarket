import {
  Body,
  Controller,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';
import { SincronizacionService } from './sincronizacion.service';
import { CreateSincronizacionDto } from './dto/create-sincronizacion.dto';
import { FilterSincronizacionDto } from './dto/filter-sincronizacion.dto';
import { ResolverItemDto } from './dto/resolver-item.dto';

@ApiTags('sincronizacion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sincronizacion')
export class SincronizacionController {
  constructor(private service: SincronizacionService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.SINCRONIZACION, 'leer')
  @ApiOperation({ summary: 'Listar sincronizaciones paginadas (JEFE_VENTA o ADMIN)' })
  findAll(@Query() filters: FilterSincronizacionDto, @Request() req: any) {
    return this.service.findAll(filters, req.user.empresaId);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.SINCRONIZACION, 'leer')
  @ApiOperation({ summary: 'Ver sincronización con todos los items de reconciliación' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.SINCRONIZACION, 'crear')
  @ApiOperation({ summary: 'Ejecutar nueva sincronización para un período dado' })
  ejecutar(@Body() dto: CreateSincronizacionDto, @Request() req: any) {
    return this.service.ejecutar(dto, req.user.id, req.user.empresaId);
  }

  @Post(':id/items/:itemId/resolver')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.SINCRONIZACION, 'editar')
  @ApiOperation({ summary: 'Resolver manualmente un item de reconciliación' })
  resolverItem(
    @Param('id', ParseIntPipe)     sincronizacionId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: ResolverItemDto,
    @Request() req: any,
  ) {
    return this.service.resolverItem(sincronizacionId, itemId, dto, req.user.id, req.user.empresaId);
  }

  @Post(':id/resolver-auto')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.SINCRONIZACION, 'editar')
  @ApiOperation({ summary: 'Resolver automáticamente TODAS las diferencias pendientes (requiere confirmación en frontend)' })
  resolverAutoAll(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.resolverAutoAll(id, req.user.id, req.user.empresaId);
  }
}
