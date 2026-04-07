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
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { FilterVentaDto } from './dto/filter-venta.dto';

@ApiTags('ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private service: VentasService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VENTAS, 'leer')
  @ApiOperation({ summary: 'Listar ventas paginadas con filtros' })
  findAll(@Query() filters: FilterVentaDto, @Request() req: any) {
    return this.service.findAll(filters, req.user.empresaId);
  }

  @Get('hoy')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VENTAS, 'leer')
  @ApiOperation({ summary: 'Ventas del día actual (lista del día)' })
  findHoy(
    @Query('almacenId') almacenId: string | undefined,
    @Request() req: any,
  ) {
    return this.service.findHoy(req.user.empresaId, almacenId ? +almacenId : undefined);
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VENTAS, 'leer')
  @ApiOperation({ summary: 'Obtener venta por ID con items y devoluciones' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VENTAS, 'crear')
  @ApiOperation({ summary: 'Registrar nueva venta' })
  create(@Body() dto: CreateVentaDto, @Request() req: any) {
    return this.service.create(dto, req.user.id, req.user.empresaId, req.user.rol);
  }
}
