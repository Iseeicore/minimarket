import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuloApp, RolUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccionPermiso, PERMISO_KEY } from '../decorators/permiso.decorator';
import { PERMISOS_DEFAULT } from '../constants/permisos-default';

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

    // 1º — buscar permiso explícito en DB (el admin puede haber personalizado)
    const registro = await this.prisma.permisoUsuario.findUnique({
      where: {
        usuarioId_modulo: { usuarioId: user.id, modulo: permiso.modulo },
      },
    });

    if (registro) return registro[permiso.accion] === true;

    // 2º — sin registro en DB → usar PERMISOS_DEFAULT del rol como fallback
    const defaults = PERMISOS_DEFAULT[user.rol as RolUsuario];
    if (!defaults) return false;

    const moduloDefault = defaults.find((d) => d.modulo === permiso.modulo);
    return moduloDefault?.[permiso.accion] === true;
  }
}
