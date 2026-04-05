import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuloApp } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchPermisosDto } from './dto/upsert-permiso.dto';

const TODOS_LOS_MODULOS = Object.values(ModuloApp);

@Injectable()
export class PermisosService {
  constructor(private prisma: PrismaService) {}

  async findByUsuario(usuarioId: number, empresaId: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!usuario) throw new NotFoundException(`Usuario #${usuarioId} no encontrado`);

    const registros = await this.prisma.permisoUsuario.findMany({
      where: { usuarioId },
    });

    const map = new Map(registros.map((r) => [r.modulo, r]));

    // Retorna todos los módulos — los sin registro aparecen con todo en false
    return TODOS_LOS_MODULOS.map((modulo) => ({
      modulo,
      leer:     map.get(modulo)?.leer     ?? false,
      crear:    map.get(modulo)?.crear    ?? false,
      editar:   map.get(modulo)?.editar   ?? false,
      eliminar: map.get(modulo)?.eliminar ?? false,
    }));
  }

  async upsertByUsuario(usuarioId: number, empresaId: number, dto: BatchPermisosDto) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!usuario) throw new NotFoundException(`Usuario #${usuarioId} no encontrado`);

    await this.prisma.$transaction(
      dto.permisos.map(({ modulo, leer, crear, editar, eliminar }) =>
        this.prisma.permisoUsuario.upsert({
          where: { usuarioId_modulo: { usuarioId, modulo } },
          create: { usuarioId, modulo, leer, crear, editar, eliminar },
          update: { leer, crear, editar, eliminar },
        }),
      ),
    );

    return this.findByUsuario(usuarioId, empresaId);
  }
}
