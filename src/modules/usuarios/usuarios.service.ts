import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PERMISOS_DEFAULT } from '../../common/constants/permisos-default';
import { RolUsuario } from '@prisma/client';

const SELECT_USUARIO = {
  id: true,
  empresaId: true,
  almacenId: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  passwordHash: false,
  empresa: { select: { id: true, nombre: true } },
  almacen: { select: { id: true, nombre: true } },
};

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  findAll(empresaId: number) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      select: SELECT_USUARIO,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      select: SELECT_USUARIO,
    });
    if (!usuario) throw new NotFoundException(`Usuario #${id} no encontrado`);
    return usuario;
  }

  async create(dto: CreateUsuarioDto, empresaId: number) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existe) throw new BadRequestException('Ya existe un usuario con ese email');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          empresaId,
          almacenId: dto.almacenId,
          nombre:    dto.nombre,
          email:     dto.email,
          passwordHash,
          rol:       dto.rol,
        },
        select: SELECT_USUARIO,
      });

      // Auto-seedear permisos según rol (JEFE_ALMACEN, JEFE_VENTA)
      const defaults = PERMISOS_DEFAULT[dto.rol];
      if (defaults?.length) {
        await tx.permisoUsuario.createMany({
          data: defaults.map((p) => ({ ...p, usuarioId: usuario.id })),
          skipDuplicates: true,
        });
      }

      return usuario;
    });
  }

  async update(id: number, dto: UpdateUsuarioDto, empresaId: number) {
    const usuario = await this.findOne(id, empresaId);

    const data: Record<string, unknown> = {
      nombre: dto.nombre,
      rol: dto.rol,
      almacenId: dto.almacenId,
      activo: dto.activo,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    // Eliminar undefined para no sobreescribir con null
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    // Si se actualiza el rol (o se re-guarda el mismo), re-sincronizar permisos
    // al PERMISOS_DEFAULT actual para ese rol. Esto corrige permisos desactualizados.
    const rolDestino = (dto.rol ?? usuario.rol) as RolUsuario;
    const defaults   = PERMISOS_DEFAULT[rolDestino];

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.usuario.update({
        where: { id },
        data,
        select: SELECT_USUARIO,
      });

      if (defaults?.length) {
        // Eliminar todos los permisos existentes y re-crear con los defaults actuales.
        // Si el ADMIN necesita permisos customizados, los asigna aparte.
        await tx.permisoUsuario.deleteMany({ where: { usuarioId: id } });
        await tx.permisoUsuario.createMany({
          data: defaults.map((p) => ({ ...p, usuarioId: id })),
        });
      }

      return updated;
    });
  }

  /**
   * Siembra permisos faltantes para todos los JEFE_ALMACEN / JEFE_VENTA de la empresa
   * que no tengan ningún permiso registrado. Idempotente — usa skipDuplicates.
   * Devuelve cuántos usuarios fueron reparados.
   */
  async repararPermisos(empresaId: number): Promise<{ reparados: number }> {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        rol: { in: ['JEFE_ALMACEN', 'JEFE_VENTA'] },
        activo: true,
      },
      select: { id: true, rol: true, _count: { select: { permisos: true } } },
    });

    let reparados = 0;
    for (const u of usuarios) {
      if (u._count.permisos > 0) continue;
      const defaults = PERMISOS_DEFAULT[u.rol as RolUsuario];
      if (!defaults?.length) continue;
      await this.prisma.permisoUsuario.createMany({
        data: defaults.map((p) => ({ ...p, usuarioId: u.id })),
        skipDuplicates: true,
      });
      reparados++;
    }

    return { reparados };
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: SELECT_USUARIO,
    });
  }
}
