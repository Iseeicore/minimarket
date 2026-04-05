import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
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
  @ApiOperation({ summary: 'Listar todas las cajas (ADMIN o permiso CAJA→leer)' })
  findAll() {
    return this.service.findAll();
  }

  @Get('activa/:almacenId')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'leer')
  @ApiOperation({ summary: 'Obtener la caja activa de un almacén (ADMIN o permiso CAJA→leer)' })
  getActiva(@Param('almacenId', ParseIntPipe) almacenId: number) {
    return this.service.getActiva(almacenId);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'leer')
  @ApiOperation({ summary: 'Obtener caja por ID con sus movimientos (ADMIN o permiso CAJA→leer)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/movimientos')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'leer')
  @ApiOperation({ summary: 'Listar movimientos de una caja (ADMIN o permiso CAJA→leer)' })
  getMovimientos(@Param('id', ParseIntPipe) id: number) {
    return this.service.getMovimientos(id);
  }

  @Post('abrir')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'crear')
  @ApiOperation({ summary: 'Abrir una nueva caja (ADMIN o permiso CAJA→crear)' })
  abrir(@Body() dto: AbrirCajaDto, @Request() req: any) {
    return this.service.abrir(dto, req.user.id);
  }

  @Post(':id/cerrar')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'crear')
  @ApiOperation({ summary: 'Cerrar caja e ingresar monto físico contado (ADMIN o permiso CAJA→crear)' })
  cerrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CerrarCajaDto) {
    return this.service.cerrar(id, dto);
  }

  @Post(':id/movimientos')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.CAJA, 'crear')
  @ApiOperation({ summary: 'Registrar movimiento manual en caja (ADMIN o permiso CAJA→crear)' })
  addMovimiento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMovimientoCajaDto,
  ) {
    return this.service.addMovimiento(id, dto);
  }
}
