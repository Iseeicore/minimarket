import { ModuloApp, RolUsuario } from '@prisma/client';

// Permisos que se auto-seedean al crear un usuario con estos roles.
// ADMIN no necesita registros — el guard le da bypass total.
// ALMACENERO no tiene defaults — el ADMIN le asigna manualmente.

type PermisoSet = {
  modulo: ModuloApp;
  leer: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
};

export const PERMISOS_DEFAULT: Partial<Record<RolUsuario, PermisoSet[]>> = {

  // ─── JEFE_ALMACEN ───────────────────────────────────────────────────────────
  // Técnico de almacén: gestiona stock, crea notas de venta, lleva su cuaderno.
  // Abre y cierra caja (crear = abrir/cerrar/movimientos).
  // NO accede a sincronización (eso es del JEFE_VENTA), ni a config (ADMIN).
  [RolUsuario.JEFE_ALMACEN]: [
    { modulo: ModuloApp.PRODUCTOS,        leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.VARIANTES,        leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.STOCK,            leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.VENTAS,           leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.COMPRAS,          leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.CAJA,             leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.DEVOLUCIONES,     leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.REGISTRO_ALMACEN, leer: true,  crear: true,  editar: true,  eliminar: false },
    { modulo: ModuloApp.DASHBOARD,        leer: true,  crear: false, editar: false, eliminar: false },
  ],

  // ─── ALMACENERO ─────────────────────────────────────────────────────────────
  // Operativo de almacén: abre/cierra caja, registra ventas y devoluciones.
  // El ADMIN puede ampliar o restringir estos permisos manualmente.
  [RolUsuario.ALMACENERO]: [
    { modulo: ModuloApp.PRODUCTOS,    leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.VARIANTES,    leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.STOCK,        leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.VENTAS,       leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.COMPRAS,      leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.CAJA,         leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.DEVOLUCIONES, leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.BITACORA,     leer: true,  crear: true,  editar: false, eliminar: false },
    { modulo: ModuloApp.DASHBOARD,    leer: true,  crear: false, editar: false, eliminar: false },
  ],

  // ─── JEFE_VENTA ─────────────────────────────────────────────────────────────
  // Responsable de tienda: anota en su cuaderno, consulta ventas del día,
  // inicia y resuelve sincronizaciones. NO toca stock ni caja directamente.
  [RolUsuario.JEFE_VENTA]: [
    { modulo: ModuloApp.PRODUCTOS,        leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.VARIANTES,        leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.STOCK,            leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.VENTAS,           leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.DEVOLUCIONES,     leer: true,  crear: false, editar: false, eliminar: false },
    { modulo: ModuloApp.REGISTRO_TIENDA,  leer: true,  crear: true,  editar: true,  eliminar: false },
    { modulo: ModuloApp.SINCRONIZACION,   leer: true,  crear: true,  editar: true,  eliminar: false },
    { modulo: ModuloApp.DASHBOARD,        leer: true,  crear: false, editar: false, eliminar: false },
  ],

};
