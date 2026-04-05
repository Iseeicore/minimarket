import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuloApp } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccionPermiso, PERMISO_KEY } from '../decorators/permiso.decorator';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permiso = this.reflector.getAllAndOverride<{
      modulo: ModuloApp;
      accion: AccionPermiso;
    }>(PERMISO_KEY, [context.getHandler(), context.getClass()]);

    if (!permiso) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // ADMIN siempre tiene acceso total
    if (user.rol === 'ADMIN') return true;

    // ALMACENERO → verificar permiso específico en DB
    const registro = await this.prisma.permisoUsuario.findUnique({
      where: {
        usuarioId_modulo: { usuarioId: user.id, modulo: permiso.modulo },
      },
    });

    return registro?.[permiso.accion] === true;
  }
}
