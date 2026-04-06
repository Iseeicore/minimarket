import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlmacenesService } from './almacenes.service';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('almacenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('almacenes')
export class AlmacenesController {
  constructor(private readonly service: AlmacenesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar almacenes de la empresa' })
  findAll(@Request() req: any) { return this.service.findAll(req.user.empresaId); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener almacén por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear almacén' })
  create(@Body() dto: CreateAlmacenDto, @Request() req: any) {
    return this.service.create(dto, req.user.empresaId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar almacén' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAlmacenDto, @Request() req: any) {
    return this.service.update(id, dto, req.user.empresaId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar almacén' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user.empresaId);
  }
}
