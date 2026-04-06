import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Request, UseGuards, Query } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Listar contactos de la empresa' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['CLIENTE', 'PROVEEDOR', 'AMBOS'] })
  findAll(@Request() req: any, @Query('tipo') tipo?: string) {
    return this.service.findAll(req.user.empresaId, tipo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener contacto por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear contacto' })
  create(@Body() dto: CreateContactoDto, @Request() req: any) {
    return this.service.create(dto, req.user.empresaId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar contacto' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactoDto, @Request() req: any) {
    return this.service.update(id, dto, req.user.empresaId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar contacto' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user.empresaId);
  }
}
