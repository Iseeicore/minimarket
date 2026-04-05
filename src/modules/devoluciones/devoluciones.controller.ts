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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';

@ApiTags('devoluciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devoluciones')
export class DevolucionesController {
  constructor(private service: DevolucionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar devoluciones paginadas' })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener devolución por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Procesar devolución de venta (revierte stock y caja)' })
  create(@Body() dto: CreateDevolucionDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }
}
