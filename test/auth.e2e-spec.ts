import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ---------------------------------------------------------------------------
// Datos de prueba — identificadores unicos para no colisionar con datos reales
// ---------------------------------------------------------------------------
const TEST_EMAIL = 'e2e.admin@minimarket-test.local';
const TEST_RUC   = '29999999998';
const TEST_PASS  = 'TestPass123';

const registerPayload = {
  nombre: 'Admin E2E',
  email: TEST_EMAIL,
  password: TEST_PASS,
  nombreEmpresa: 'Empresa E2E Test',
  ruc: TEST_RUC,
  direccionEmpresa: 'Av Test 100',
  telefonoEmpresa: '999111222',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('Auth (e2e — BD real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Limpieza previa — por si un test anterior fallo a mitad
    await cleanupEmpresa(prisma);
  });

  afterAll(async () => {
    await cleanupEmpresa(prisma);
    await app.close();
  });

  // -------------------------------------------------------------------------
  // POST /auth/register
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/register', () => {
    it('crea empresa + usuario ADMIN y retorna token con datos', async () => {
      const { body, status } = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerPayload);

      expect(status).toBe(201);
      expect(body.access_token).toBeDefined();
      expect(body.usuario.email).toBe(TEST_EMAIL);
      expect(body.usuario.rol).toBe('ADMIN');
      expect(body.empresa.ruc).toBe(TEST_RUC);

      authToken = body.access_token;
    });

    it('retorna 400 cuando el email ya esta registrado', async () => {
      const { status, body } = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerPayload);

      expect(status).toBe(400);
      expect(body.message).toMatch(/ya existe/i);
    });
  });

  // -------------------------------------------------------------------------
  // POST /auth/login
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/login', () => {
    it('retorna token cuando las credenciales son correctas', async () => {
      const { body, status } = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASS });

      expect(status).toBe(201);
      expect(body.access_token).toBeDefined();
      expect(body.usuario.email).toBe(TEST_EMAIL);
    });

    it('retorna 401 cuando la contrasena es incorrecta', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: 'wrong_password' });

      expect(status).toBe(401);
    });

    it('retorna 401 cuando el email no existe', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'noexiste@test.local', password: TEST_PASS });

      expect(status).toBe(401);
    });

    it('retorna 400 cuando el body esta incompleto', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL });

      expect(status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /usuarios — ruta protegida
  // -------------------------------------------------------------------------
  describe('GET /api/v1/usuarios (ruta protegida)', () => {
    it('retorna 200 con el token ADMIN obtenido en el registro', async () => {
      const { status, body } = await request(app.getHttpServer())
        .get('/api/v1/usuarios')
        .set('Authorization', `Bearer ${authToken}`);

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it('retorna 401 sin token', async () => {
      const { status } = await request(app.getHttpServer()).get('/api/v1/usuarios');

      expect(status).toBe(401);
    });
  });
});

// ---------------------------------------------------------------------------
// Cleanup completo — elimina en orden correcto respetando FKs
// ---------------------------------------------------------------------------
async function cleanupEmpresa(prisma: PrismaService): Promise<void> {
  const empresa = await prisma.empresa.findFirst({ where: { ruc: TEST_RUC } });
  if (!empresa) return;

  const empresaId = empresa.id;

  const almacenesList = await prisma.almacen.findMany({
    where: { empresaId },
    select: { id: true },
  });
  const almacenIds = almacenesList.map((a) => a.id);

  if (almacenIds.length > 0) {
    // Ventas y sus dependientes
    const ventasList = await prisma.venta.findMany({
      where: { almacenId: { in: almacenIds } },
      select: { id: true },
    });
    const ventaIds = ventasList.map((v) => v.id);

    if (ventaIds.length > 0) {
      const devolucionesList = await prisma.devolucion.findMany({
        where: { ventaId: { in: ventaIds } },
        select: { id: true },
      });
      const devolucionIds = devolucionesList.map((d) => d.id);

      if (devolucionIds.length > 0) {
        await prisma.itemDevolucion.deleteMany({ where: { devolucionId: { in: devolucionIds } } });
        await prisma.devolucion.deleteMany({ where: { id: { in: devolucionIds } } });
      }
      await prisma.itemVenta.deleteMany({ where: { ventaId: { in: ventaIds } } });
      await prisma.venta.deleteMany({ where: { id: { in: ventaIds } } });
    }

    // Cajas y movimientos
    const cajasList = await prisma.caja.findMany({
      where: { almacenId: { in: almacenIds } },
      select: { id: true },
    });
    const cajaIds = cajasList.map((c) => c.id);
    if (cajaIds.length > 0) {
      await prisma.movimientoCaja.deleteMany({ where: { cajaId: { in: cajaIds } } });
      await prisma.caja.deleteMany({ where: { id: { in: cajaIds } } });
    }

    // Ordenes de compra
    const ordenesList = await prisma.ordenCompra.findMany({
      where: { almacenId: { in: almacenIds } },
      select: { id: true },
    });
    const ordenIds = ordenesList.map((o) => o.id);
    if (ordenIds.length > 0) {
      await prisma.itemCompra.deleteMany({ where: { ordenCompraId: { in: ordenIds } } });
      await prisma.pagoCompra.deleteMany({ where: { ordenCompraId: { in: ordenIds } } });
      await prisma.ordenCompra.deleteMany({ where: { id: { in: ordenIds } } });
    }

    // Ordenes salida
    const ordenesSalida = await prisma.ordenSalida.findMany({ where: { almacenId: { in: almacenIds } }, select: { id: true } });
    if (ordenesSalida.length > 0) {
      await prisma.ordenSalidaDetalle.deleteMany({ where: { ordenSalidaId: { in: ordenesSalida.map(o => o.id) } } });
      await prisma.ordenSalida.deleteMany({ where: { almacenId: { in: almacenIds } } });
    }

    // Registros
    await prisma.registroTienda.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.registroAlmacen.deleteMany({ where: { almacenId: { in: almacenIds } } });

    // Sincronizacion
    const sincs = await prisma.sincronizacion.findMany({ where: { almacenId: { in: almacenIds } }, select: { id: true } });
    if (sincs.length > 0) {
      await prisma.reconciliacionItem.deleteMany({ where: { sincronizacionId: { in: sincs.map(s => s.id) } } }).catch(() => {});
      await prisma.sincronizacion.deleteMany({ where: { almacenId: { in: almacenIds } } });
    }

    // Stock, movimientos y bitacora
    await prisma.stockTienda.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.stockAlmacen.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.movimientoStock.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.bitacora.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.resumenDia.deleteMany({ where: { almacenId: { in: almacenIds } } });
    await prisma.almacen.deleteMany({ where: { id: { in: almacenIds } } });
  }

  // Usuarios y sus permisos
  const usuariosList = await prisma.usuario.findMany({
    where: { empresaId },
    select: { id: true },
  });
  const usuarioIds = usuariosList.map((u) => u.id);
  if (usuarioIds.length > 0) {
    await prisma.permisoUsuario.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { empresaId } });
  }

  // Variantes, productos, categorías, contactos
  const productos = await prisma.producto.findMany({ where: { empresaId }, select: { id: true } });
  if (productos.length > 0) {
    await prisma.variante.deleteMany({ where: { productoId: { in: productos.map(p => p.id) } } });
    await prisma.producto.deleteMany({ where: { empresaId } });
  }
  await prisma.categoria.deleteMany({ where: { empresaId } });
  await prisma.contacto.deleteMany({ where: { empresaId } });

  // Empresa
  await prisma.empresa.delete({ where: { id: empresaId } });
}
