import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuloApp } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CreateMovimientoCajaDto } from './dto/create-movimiento-caja.dto';

@ApiTags('caja')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caja')
export class CajaController {
  constructor(private service: CajaService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'leer')
  @ApiOperation({ summary: 'Listar cajas de la empresa' })
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.empresaId);
  }

  @Get('activa/:almacenId')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'leer')
  @ApiOperation({ summary: 'Caja activa de un almacén' })
  getActiva(@Param('almacenId', ParseIntPipe) almacenId: number, @Request() req: any) {
    return this.service.getActiva(almacenId, req.user.empresaId);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'leer')
  @ApiOperation({ summary: 'Obtener caja por ID con movimientos' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Get(':id/movimientos')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'leer')
  @ApiOperation({ summary: 'Movimientos de una caja' })
  getMovimientos(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.getMovimientos(id, req.user.empresaId);
  }

  @Post('abrir')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'crear')
  @ApiOperation({ summary: 'Abrir nueva caja' })
  abrir(@Body() dto: AbrirCajaDto, @Request() req: any) {
    return this.service.abrir(dto, req.user.id, req.user.empresaId);
  }

  @Post(':id/cerrar')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'crear')
  @ApiOperation({ summary: 'Cerrar caja y generar resumen del día' })
  cerrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CerrarCajaDto, @Request() req: any) {
    return this.service.cerrar(id, dto, req.user.empresaId);
  }

  @Post(':id/movimientos')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'crear')
  @ApiOperation({ summary: 'Registrar movimiento manual en caja' })
  addMovimiento(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateMovimientoCajaDto, @Request() req: any) {
    return this.service.addMovimiento(id, dto, req.user.empresaId);
  }
}
