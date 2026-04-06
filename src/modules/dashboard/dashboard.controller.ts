import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Resumen completo del dashboard' })
  getSummary(@Request() req: any) {
    return this.service.getSummary(req.user.empresaId);
  }

  @Get('ventas-semana')
  @ApiOperation({ summary: 'Ventas por día — últimos 7 días' })
  getVentasSemana(@Request() req: any) {
    return this.service.getVentasSemana(req.user.empresaId);
  }

  @Get('lista-dia')
  @ApiQuery({ name: 'fecha', required: false, example: '2026-04-03' })
  @ApiOperation({ summary: 'Productos vendidos agrupados por variante' })
  getListaDia(@Request() req: any, @Query('fecha') fecha?: string) {
    return this.service.getListaDia(req.user.empresaId, fecha);
  }

  @Get('lista-dia/cruda')
  @ApiQuery({ name: 'fecha', required: false, example: '2026-04-03' })
  @ApiOperation({ summary: 'Items sin agrupar — estilo papel y lápiz' })
  getListaDiaCruda(@Request() req: any, @Query('fecha') fecha?: string) {
    return this.service.getListaDiaCruda(req.user.empresaId, fecha);
  }

  @Get('historico')
  @ApiQuery({ name: 'page',      required: false, example: 1  })
  @ApiQuery({ name: 'limit',     required: false, example: 30 })
  @ApiQuery({ name: 'almacenId', required: false, example: 1  })
  @ApiOperation({ summary: 'Histórico paginado de ResumenDia' })
  getHistorico(
    @Request() req: any,
    @Query('page')      page      = '1',
    @Query('limit')     limit     = '30',
    @Query('almacenId') almacenId?: string,
  ) {
    return this.service.getHistorico(
      req.user.empresaId,
      parseInt(page),
      parseInt(limit),
      almacenId ? parseInt(almacenId) : undefined,
    );
  }

  @Get('stock-bajo')
  @ApiOperation({ summary: 'Variantes con stock ≤ mínimo' })
  getStockBajo(@Request() req: any) {
    return this.service.getStockBajo(req.user.empresaId);
  }

  @Get('valor-inventario')
  @ApiOperation({ summary: 'Valor total del inventario' })
  getValorInventario(@Request() req: any) {
    return this.service.getValorInventario(req.user.empresaId);
  }

  @Get('top-variantes')
  @ApiOperation({ summary: 'Top 10 variantes más vendidas del mes' })
  getTopVariantes(@Request() req: any) {
    return this.service.getTopVariantes(req.user.empresaId);
  }

  @Get('cajas')
  @ApiOperation({ summary: 'Resumen de cajas recientes' })
  getResumenCajas(@Request() req: any) {
    return this.service.getResumenCajas(req.user.empresaId);
  }
}
