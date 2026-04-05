import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ModuloApp } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermisosGuard)
@Permiso(ModuloApp.DASHBOARD, 'leer')
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumen completo del dashboard (ADMIN o permiso DASHBOARD→leer)' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('ventas-semana')
  @ApiOperation({ summary: 'Ventas por día — últimos 7 días (ADMIN o permiso DASHBOARD→leer)' })
  getVentasSemana() {
    return this.service.getVentasSemana();
  }

  @Get('lista-dia')
  @ApiQuery({ name: 'fecha', required: false, example: '2026-04-03', description: 'YYYY-MM-DD — hoy si no se pasa' })
  @ApiOperation({ summary: 'Productos vendidos agrupados por variante (ADMIN o permiso DASHBOARD→leer)' })
  getListaDia(@Query('fecha') fecha?: string) {
    return this.service.getListaDia(fecha);
  }

  @Get('lista-dia/cruda')
  @ApiQuery({ name: 'fecha', required: false, example: '2026-04-03', description: 'YYYY-MM-DD — hoy si no se pasa' })
  @ApiOperation({ summary: 'Items sin agrupar estilo papel y lápiz (ADMIN o permiso DASHBOARD→leer)' })
  getListaDiaCruda(@Query('fecha') fecha?: string) {
    return this.service.getListaDiaCruda(fecha);
  }

  @Get('historico')
  @ApiQuery({ name: 'page',      required: false, example: 1  })
  @ApiQuery({ name: 'limit',     required: false, example: 30 })
  @ApiQuery({ name: 'almacenId', required: false, example: 1  })
  @ApiOperation({ summary: 'Histórico paginado de ResumenDia (ADMIN o permiso DASHBOARD→leer)' })
  getHistorico(
    @Query('page')      page      = '1',
    @Query('limit')     limit     = '30',
    @Query('almacenId') almacenId?: string,
  ) {
    return this.service.getHistorico(
      parseInt(page),
      parseInt(limit),
      almacenId ? parseInt(almacenId) : undefined,
    );
  }

  @Get('stock-bajo')
  @ApiOperation({ summary: 'Variantes con stock ≤ stock mínimo (ADMIN o permiso DASHBOARD→leer)' })
  getStockBajo() {
    return this.service.getStockBajo();
  }

  @Get('valor-inventario')
  @ApiOperation({ summary: 'Valor total del inventario (ADMIN o permiso DASHBOARD→leer)' })
  getValorInventario() {
    return this.service.getValorInventario();
  }

  @Get('top-variantes')
  @ApiOperation({ summary: 'Top 10 variantes más vendidas del mes (ADMIN o permiso DASHBOARD→leer)' })
  getTopVariantes() {
    return this.service.getTopVariantes();
  }

  @Get('cajas')
  @ApiOperation({ summary: 'Resumen de cajas recientes (ADMIN o permiso DASHBOARD→leer)' })
  getResumenCajas() {
    return this.service.getResumenCajas();
  }
}
