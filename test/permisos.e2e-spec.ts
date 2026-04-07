import {
  setupTestEnv,
  teardownTestEnv,
  getCtx,
  get,
  post,
  del,
  noAuth,
} from './helpers/setup';

// ─────────────────────────────────────────────────────────────────────────────
// Permisos E2E — verifica que PermisosGuard + RolesGuard funcionen correctamente
// por rol. ADMIN tiene bypass total; el resto respeta su tabla de permisos.
// ─────────────────────────────────────────────────────────────────────────────

describe('Permisos (e2e)', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  // ─── 1. ADMIN bypass ───────────────────────────────────────────────────────
  describe('ADMIN — bypass total (puede acceder a cualquier endpoint)', () => {
    it('GET /productos → 200', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/productos', adminToken);
      expect(status).toBe(200);
    });

    it('GET /usuarios → 200 (ruta exclusiva ADMIN)', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/usuarios', adminToken);
      expect(status).toBe(200);
    });

    it('GET /ordenes-salida → 200', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/ordenes-salida', adminToken);
      expect(status).toBe(200);
    });

    it('GET /caja → 200', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/caja', adminToken);
      expect(status).toBe(200);
    });

    it('GET /ventas → 200', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/ventas', adminToken);
      expect(status).toBe(200);
    });

    it('GET /registros-tienda → 200', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/registros-tienda', adminToken);
      expect(status).toBe(200);
    });

    it('GET /registros-almacen → 200', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/registros-almacen', adminToken);
      expect(status).toBe(200);
    });

    it('GET /stock → 200', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/stock', adminToken);
      expect(status).toBe(200);
    });
  });

  // ─── 2. JEFE_VENTA ─────────────────────────────────────────────────────────
  describe('JEFE_VENTA — puede acceder a sus módulos asignados', () => {
    it('GET /ordenes-salida → 200 (ORDENES_SALIDA:leer)', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await get('/ordenes-salida', jefeVentaToken);
      expect(status).toBe(200);
    });

    it('GET /caja/estado/:almacenId → 200 (CAJA:leer)', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status } = await get(`/caja/estado/${almacenId}`, jefeVentaToken);
      // 200 o 404 si no hay caja — ambos indican que el guard pasó
      expect([200, 404]).toContain(status);
    });

    it('GET /registros-tienda → 200 (REGISTRO_TIENDA:leer)', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await get('/registros-tienda', jefeVentaToken);
      expect(status).toBe(200);
    });
  });

  describe('JEFE_VENTA — NO puede acceder a módulos sin permiso', () => {
    it('POST /productos → 403 (no tiene PRODUCTOS:crear)', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await post('/productos', jefeVentaToken, {
        nombre: 'Producto No Autorizado',
        categoriaId: 1,
      });
      expect(status).toBe(403);
    });

    it('DELETE /productos/1 → 403 (no tiene PRODUCTOS:eliminar)', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await del('/productos/1', jefeVentaToken);
      expect(status).toBe(403);
    });

    it('POST /usuarios → 403 (ruta exclusiva ADMIN vía RolesGuard)', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await post('/usuarios', jefeVentaToken, {
        nombre: 'Intruso',
        email: 'intruso@test.local',
        password: 'Pass123!',
        rol: 'ALMACENERO',
      });
      expect(status).toBe(403);
    });

    it('GET /usuarios → 403 (ruta exclusiva ADMIN vía RolesGuard)', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await get('/usuarios', jefeVentaToken);
      expect(status).toBe(403);
    });
  });

  // ─── 3. ALMACENERO ─────────────────────────────────────────────────────────
  describe('ALMACENERO — puede acceder a sus módulos asignados', () => {
    it('GET /caja → 200 (CAJA:leer)', async () => {
      const { almaceneroToken } = getCtx();
      const { status } = await get('/caja', almaceneroToken);
      expect(status).toBe(200);
    });

    it('GET /ventas → 200 (VENTAS:leer)', async () => {
      const { almaceneroToken } = getCtx();
      const { status } = await get('/ventas', almaceneroToken);
      expect(status).toBe(200);
    });
  });

  describe('ALMACENERO — NO puede acceder a módulos sin permiso', () => {
    it('POST /ordenes-salida → 403 (no tiene ORDENES_SALIDA)', async () => {
      const { almaceneroToken, almacenId } = getCtx();
      const { status } = await post('/ordenes-salida', almaceneroToken, {
        almacenId,
        tipo: 'VENTA',
        items: [],
      });
      expect(status).toBe(403);
    });

    it('GET /registros-tienda → 403 (no tiene REGISTRO_TIENDA)', async () => {
      const { almaceneroToken } = getCtx();
      const { status } = await get('/registros-tienda', almaceneroToken);
      expect(status).toBe(403);
    });
  });

  // ─── 4. JEFE_ALMACEN ───────────────────────────────────────────────────────
  describe('JEFE_ALMACEN — puede acceder a sus módulos asignados', () => {
    it('GET /stock → 200 (STOCK:leer)', async () => {
      const { jefeAlmacenToken } = getCtx();
      const { status } = await get('/stock', jefeAlmacenToken);
      expect(status).toBe(200);
    });

    it('GET /registros-almacen → 200 (REGISTRO_ALMACEN:leer)', async () => {
      const { jefeAlmacenToken } = getCtx();
      const { status } = await get('/registros-almacen', jefeAlmacenToken);
      expect(status).toBe(200);
    });
  });

  describe('JEFE_ALMACEN — NO puede acceder a módulos sin permiso', () => {
    it('GET /registros-tienda → 403 (no tiene REGISTRO_TIENDA)', async () => {
      const { jefeAlmacenToken } = getCtx();
      const { status } = await get('/registros-tienda', jefeAlmacenToken);
      expect(status).toBe(403);
    });
  });

  // ─── 5. Sin token — todas las rutas protegidas retornan 401 ───────────────
  describe('Sin token — rutas protegidas retornan 401', () => {
    it('GET /productos → 401', async () => {
      const { status } = await noAuth('get', '/productos');
      expect(status).toBe(401);
    });

    it('GET /ordenes-salida → 401', async () => {
      const { status } = await noAuth('get', '/ordenes-salida');
      expect(status).toBe(401);
    });

    it('GET /caja → 401', async () => {
      const { status } = await noAuth('get', '/caja');
      expect(status).toBe(401);
    });

    it('GET /ventas → 401', async () => {
      const { status } = await noAuth('get', '/ventas');
      expect(status).toBe(401);
    });

    it('GET /usuarios → 401', async () => {
      const { status } = await noAuth('get', '/usuarios');
      expect(status).toBe(401);
    });

    it('POST /ordenes-salida → 401', async () => {
      const { status } = await noAuth('post', '/ordenes-salida', { tipo: 'VENTA', items: [] });
      expect(status).toBe(401);
    });
  });

  // ─── 6. Token inválido — retorna 401 ──────────────────────────────────────
  describe('Token inválido — retorna 401', () => {
    it('GET /productos con Bearer malformado → 401', async () => {
      const { status } = await get('/productos', 'esto.no.es.un.jwt');
      expect(status).toBe(401);
    });

    it('GET /caja con Bearer vacío → 401', async () => {
      const { status } = await get('/caja', '');
      expect(status).toBe(401);
    });

    it('GET /ventas con Bearer expirado/falso → 401', async () => {
      // JWT sintácticamente válido pero firmado con clave incorrecta
      const fakeJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOjk5OTk5LCJyb2wiOiJBRE1JTiIsImlhdCI6MTV9.' +
        'FIRMA_INVALIDA_QUE_NO_CORRESPONDE_AL_SECRET';
      const { status } = await get('/ventas', fakeJwt);
      expect(status).toBe(401);
    });
  });
});
