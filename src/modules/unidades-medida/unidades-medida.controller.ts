import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UnidadesMedidaService } from './unidades-medida.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('unidades-medida')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('unidades-medida')
export class UnidadesMedidaController {
  constructor(private readonly service: UnidadesMedidaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar unidades de medida' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener unidad de medida por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Crear unidad de medida' })
  create(@Body() dto: CreateUnidadMedidaDto) { return this.service.create(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar unidad de medida' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnidadMedidaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar unidad de medida' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
