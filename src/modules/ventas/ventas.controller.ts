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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/decorators/permiso.decorator';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@ApiTags('ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private service: VentasService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VENTAS, 'leer')
  @ApiOperation({ summary: 'Listar ventas paginadas (ADMIN o permiso VENTAS→leer)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get('hoy')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VENTAS, 'leer')
  @ApiOperation({ summary: 'Ventas del día actual (ADMIN o permiso VENTAS→leer)' })
  findHoy() {
    return this.service.findHoy();
  }

  @Get(':id')
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VENTAS, 'leer')
  @ApiOperation({ summary: 'Obtener venta por ID con items y devoluciones (ADMIN o permiso VENTAS→leer)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permiso(ModuloApp.VENTAS, 'crear')
  @ApiOperation({ summary: 'Registrar nueva venta (ADMIN o permiso VENTAS→crear)' })
  create(@Body() dto: CreateVentaDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }
}
