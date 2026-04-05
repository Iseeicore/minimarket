import { Body, Controller, Get, Param, ParseIntPipe, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermisosService } from './permisos.service';
import { BatchPermisosDto } from './dto/upsert-permiso.dto';

@ApiTags('permisos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('permisos')
export class PermisosController {
  constructor(private service: PermisosService) {}

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Ver permisos por módulo de un usuario (ADMIN)' })
  findByUsuario(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Request() req: any,
  ) {
    return this.service.findByUsuario(usuarioId, req.user.empresaId);
  }

  @Put('usuario/:usuarioId')
  @ApiOperation({ summary: 'Asignar permisos por módulo a un usuario — reemplaza los enviados (ADMIN)' })
  upsert(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: BatchPermisosDto,
    @Request() req: any,
  ) {
    return this.service.upsertByUsuario(usuarioId, req.user.empresaId, dto);
  }
}
