import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RoleThrottlerGuard } from './common/guards/role-throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { UnidadesMedidaModule } from './modules/unidades-medida/unidades-medida.module';
import { AlmacenesModule } from './modules/almacenes/almacenes.module';
import { ProductosModule } from './modules/productos/productos.module';
import { VariantesModule } from './modules/variantes/variantes.module';
import { ContactosModule } from './modules/contactos/contactos.module';
import { ComprasModule } from './modules/compras/compras.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { CajaModule } from './modules/caja/caja.module';
import { DevolucionesModule } from './modules/devoluciones/devoluciones.module';
import { StockModule } from './modules/stock/stock.module';
import { BitacoraModule } from './modules/bitacora/bitacora.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { PermisosModule } from './modules/permisos/permisos.module';
import { RegistrosAlmacenModule } from './modules/registros-almacen/registros-almacen.module';
import { RegistrosTiendaModule } from './modules/registros-tienda/registros-tienda.module';
import { SincronizacionModule } from './modules/sincronizacion/sincronizacion.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'almacenero',   ttl: 180_000, limit: 300 }, // 300 req / 3 min — mostrador activo
      { name: 'admin',        ttl: 180_000, limit: 100 }, // 100 req / 3 min — uso administrativo
      { name: 'jefe_venta',   ttl: 180_000, limit: 200 }, // 200 req / 3 min — tienda activa
      { name: 'jefe_almacen', ttl: 180_000, limit: 200 }, // 200 req / 3 min — almacén activo
      { name: 'publico',      ttl:  60_000, limit: 10  }, // 10 req / 1 min  — login y register
    ]),
    PrismaModule,
    AuthModule,
    CategoriasModule,
    UnidadesMedidaModule,
    AlmacenesModule,
    ProductosModule,
    VariantesModule,
    ContactosModule,
    ComprasModule,
    VentasModule,
    CajaModule,
    DevolucionesModule,
    StockModule,
    BitacoraModule,
    DashboardModule,
    UsuariosModule,
    PermisosModule,
    RegistrosAlmacenModule,
    RegistrosTiendaModule,
    SincronizacionModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RoleThrottlerGuard },
  ],
})
export class AppModule {}
