import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ContactosService } from './contactos.service';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('contactos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contactos')
export class ContactosController {
  constructor(private readonly service: ContactosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contactos' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['CLIENTE', 'PROVEEDOR', 'AMBOS'] })
  findAll(@Query('tipo') tipo?: string) { return this.service.findAll(tipo); }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener contacto por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Crear contacto' })
  create(@Body() dto: CreateContactoDto) { return this.service.create(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar contacto' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar contacto' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
