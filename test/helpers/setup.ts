import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

// ── Datos de prueba — no colisionan con data real ─────────────────────────────

export const TEST_RUC   = '29999999999';
export const TEST_ADMIN = { email: 'e2e.admin@test.local',      password: 'Admin123!',    nombre: 'Admin E2E' };
export const TEST_ALMACENERO = { email: 'e2e.almacenero@test.local', password: 'Alm123!', nombre: 'Almacenero E2E' };
export const TEST_JEFE_VENTA = { email: 'e2e.jefeventa@test.local', password: 'Jefe123!',  nombre: 'JefeVenta E2E' };
export const TEST_JEFE_ALMACEN = { email: 'e2e.jefealmacen@test.local', password: 'JefeAlm123!', nombre: 'JefeAlmacen E2E' };

const API = '/api/v1';

// ── Estado global de la suite ─────────────────────────────────────────────────

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  adminToken: string;
  almaceneroToken: string;
  jefeVentaToken: string;
  jefeAlmacenToken: string;
  empresaId: number;
  almacenId: number;
  adminId: number;
  almaceneroId: number;
  jefeVentaId: number;
  jefeAlmacenId: number;
}

let ctx: TestContext | null = null;

// ── Helpers de request ───────────────────────────────────────────────────────

export function get(path: string, token: string) {
  return request(ctx!.app.getHttpServer()).get(`${API}${path}`).set('Authorization', `Bearer ${token}`);
}

export function post(path: string, token: string, body?: any) {
  const r = request(ctx!.app.getHttpServer()).post(`${API}${path}`).set('Authorization', `Bearer ${token}`);
  return body ? r.send(body) : r;
}

export function patch(path: string, token: string, body?: any) {
  const r = request(ctx!.app.getHttpServer()).patch(`${API}${path}`).set('Authorization', `Bearer ${token}`);
  return body ? r.send(body) : r;
}

export function del(path: string, token: string) {
  return request(ctx!.app.getHttpServer()).delete(`${API}${path}`).set('Authorization', `Bearer ${token}`);
}

export function noAuth(method: 'get' | 'post', path: string, body?: any) {
  const r = request(ctx!.app.getHttpServer())[method](`${API}${path}`);
  return body ? r.send(body) : r;
}

export function getCtx(): TestContext {
  if (!ctx) throw new Error('TestContext not initialized — call setupTestEnv first');
  return ctx;
}

// ── Setup: crea app + empresa + almacen + 4 usuarios con roles ───────────────

export async function setupTestEnv(): Promise<TestContext> {
  if (ctx) return ctx;

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();

  const prisma = app.get(PrismaService);

  // Limpieza previa
  await cleanupTestData(prisma);

  // 1. Registrar empresa + admin
  const regRes = await request(app.getHttpServer())
    .post(`${API}/auth/register`)
    .send({
      nombre: TEST_ADMIN.nombre,
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
      nombreEmpresa: 'Empresa E2E Test',
      ruc: TEST_RUC,
      direccionEmpresa: 'Av Test 100',
    });

  if (regRes.status !== 201) {
    console.error('Register failed:', regRes.status, JSON.stringify(regRes.body));
    throw new Error(`Setup register failed with status ${regRes.status}: ${JSON.stringify(regRes.body)}`);
  }

  const regBody = regRes.body;
  const adminToken = regBody.access_token;
  const empresaId = regBody.empresa.id;
  const adminId = regBody.usuario.id;

  // 2. Crear almacen
  const { body: almBody } = await request(app.getHttpServer())
    .post(`${API}/almacenes`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ nombre: 'Almacen E2E', direccion: 'Test 123' });

  const almacenId = almBody.id;

  // 3. Crear usuarios con roles
  const createUser = async (data: { email: string; password: string; nombre: string }, rol: string, withAlmacen: boolean) => {
    const createRes = await request(app.getHttpServer())
      .post(`${API}/usuarios`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...data, rol, almacenId: withAlmacen ? almacenId : undefined });

    if (createRes.status !== 201) {
      console.error(`Create user ${data.email} failed:`, createRes.status, JSON.stringify(createRes.body));
      throw new Error(`Create user ${data.email} failed: ${createRes.status}`);
    }

    // Login para obtener token
    const loginRes = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: data.email, password: data.password });

    if (loginRes.status !== 201) {
      console.error(`Login ${data.email} failed:`, loginRes.status, JSON.stringify(loginRes.body));
      throw new Error(`Login ${data.email} failed: ${loginRes.status}`);
    }

    return { id: createRes.body.id, token: loginRes.body.access_token };
  };

  const almacenero = await createUser(TEST_ALMACENERO, 'ALMACENERO', true);
  const jefeVenta = await createUser(TEST_JEFE_VENTA, 'JEFE_VENTA', true);
  const jefeAlmacen = await createUser(TEST_JEFE_ALMACEN, 'JEFE_ALMACEN', true);

  ctx = {
    app, prisma, adminToken, empresaId, almacenId, adminId,
    almaceneroToken: almacenero.token,
    jefeVentaToken: jefeVenta.token,
    jefeAlmacenToken: jefeAlmacen.token,
    almaceneroId: almacenero.id,
    jefeVentaId: jefeVenta.id,
    jefeAlmacenId: jefeAlmacen.id,
  };

  return ctx;
}

// ── Teardown ─────────────────────────────────────────────────────────────────

export async function teardownTestEnv() {
  if (!ctx) return;
  await cleanupTestData(ctx.prisma);
  await ctx.app.close();
  ctx = null;
}

// ── Cleanup — elimina datos E2E respetando FKs ──────────────────────────────

async function cleanupTestData(prisma: PrismaService) {
  const empresa = await prisma.empresa.findFirst({ where: { ruc: TEST_RUC } });
  if (!empresa) return;

  const empresaId = empresa.id;
  const almacenes = await prisma.almacen.findMany({ where: { empresaId }, select: { id: true } });
  const almacenIds = almacenes.map(a => a.id);

  if (almacenIds.length > 0) {
    // Ordenes salida
    const ordenes = await prisma.ordenSalida.findMany({ where: { almacenId: { in: almacenIds } }, select: { id: true } });
    if (ordenes.length > 0) {
      await prisma.ordenSalidaDetalle.deleteMany({ where: { ordenSalidaId: { in: ordenes.map(o => o.id) } } });
      await prisma.ordenSalida.deleteMany({ where: { almacenId: { in: almacenIds } } });
    }

    // Registros
    await prisma.registroTienda.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.registroAlmacen.deleteMany({ where: { almacenId: { in: almacenIds } } });

    // Ventas
    const ventas = await prisma.venta.findMany({ where: { almacenId: { in: almacenIds } }, select: { id: true } });
    if (ventas.length > 0) {
      const devs = await prisma.devolucion.findMany({ where: { ventaId: { in: ventas.map(v => v.id) } }, select: { id: true } });
      if (devs.length > 0) {
        await prisma.itemDevolucion.deleteMany({ where: { devolucionId: { in: devs.map(d => d.id) } } });
        await prisma.devolucion.deleteMany({ where: { id: { in: devs.map(d => d.id) } } });
      }
      await prisma.itemVenta.deleteMany({ where: { ventaId: { in: ventas.map(v => v.id) } } });
      await prisma.venta.deleteMany({ where: { almacenId: { in: almacenIds } } });
    }

    // Cajas
    const cajas = await prisma.caja.findMany({ where: { almacenId: { in: almacenIds } }, select: { id: true } });
    if (cajas.length > 0) {
      await prisma.movimientoCaja.deleteMany({ where: { cajaId: { in: cajas.map(c => c.id) } } });
      await prisma.caja.deleteMany({ where: { almacenId: { in: almacenIds } } });
    }

    // Compras
    const compras = await prisma.ordenCompra.findMany({ where: { almacenId: { in: almacenIds } }, select: { id: true } });
    if (compras.length > 0) {
      await prisma.itemCompra.deleteMany({ where: { ordenCompraId: { in: compras.map(c => c.id) } } });
      await prisma.pagoCompra.deleteMany({ where: { ordenCompraId: { in: compras.map(c => c.id) } } });
      await prisma.ordenCompra.deleteMany({ where: { almacenId: { in: almacenIds } } });
    }

    // Stock y movimientos
    await prisma.stockTienda.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.stockAlmacen.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.movimientoStock.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.bitacora.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.resumenDia.deleteMany({ where: { almacenId: { in: almacenIds } } });
    // Sincronización + reconciliación
    const sincs = await prisma.sincronizacion.findMany({ where: { almacenId: { in: almacenIds } }, select: { id: true } });
    if (sincs.length > 0) {
      await prisma.reconciliacionItem.deleteMany({ where: { sincronizacionId: { in: sincs.map(s => s.id) } } }).catch(() => {});
      await prisma.sincronizacion.deleteMany({ where: { almacenId: { in: almacenIds } } });
    }

    await prisma.almacen.deleteMany({ where: { empresaId } });
  }

  // Usuarios y permisos
  const usuarios = await prisma.usuario.findMany({ where: { empresaId }, select: { id: true } });
  if (usuarios.length > 0) {
    await prisma.permisoUsuario.deleteMany({ where: { usuarioId: { in: usuarios.map(u => u.id) } } });
    await prisma.usuario.deleteMany({ where: { empresaId } });
  }

  // Variantes y productos
  const productos = await prisma.producto.findMany({ where: { empresaId }, select: { id: true } });
  if (productos.length > 0) {
    await prisma.variante.deleteMany({ where: { productoId: { in: productos.map(p => p.id) } } });
    await prisma.producto.deleteMany({ where: { empresaId } });
  }

  await prisma.categoria.deleteMany({ where: { empresaId } });
  await prisma.contacto.deleteMany({ where: { empresaId } });
  await prisma.empresa.delete({ where: { id: empresaId } });
}
