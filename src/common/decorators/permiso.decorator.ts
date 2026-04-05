import { SetMetadata } from '@nestjs/common';
import { ModuloApp } from '@prisma/client';

export type AccionPermiso = 'leer' | 'crear' | 'editar' | 'eliminar';

export const PERMISO_KEY = 'permiso';
export const Permiso = (modulo: ModuloApp, accion: AccionPermiso) =>
  SetMetadata(PERMISO_KEY, { modulo, accion });
