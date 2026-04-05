import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlmacenesService } from './almacenes.service';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('almacenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('almacenes')
export class AlmacenesController {
  constructor(private readonly service: AlmacenesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar almacenes' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener almacén por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Crear almacén' })
  create(@Body() dto: CreateAlmacenDto) { return this.service.create(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar almacén' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAlmacenDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar almacén' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
