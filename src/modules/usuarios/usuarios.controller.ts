import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('usuarios')
export class UsuariosController {
  constructor(private service: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios de la empresa (ADMIN)' })
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID (ADMIN)' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario en la empresa (ADMIN)' })
  create(@Body() dto: CreateUsuarioDto, @Request() req: any) {
    return this.service.create(dto, req.user.empresaId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario (ADMIN) — puede cambiar password' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user.empresaId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario — soft delete (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user.empresaId);
  }
}
