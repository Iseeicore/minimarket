import {
  setupTestEnv,
  teardownTestEnv,
  getCtx,
  get,
  post,
  noAuth,
} from './helpers/setup';

// ── Suite ────────────────────────────────────────────────────────────────────

describe('Caja (e2e)', () => {
  // ID de caja creada en los tests normales — se reutiliza entre describes
  let cajaId: number;

  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  // ── 1. Casos normales ─────────────────────────────────────────────────────

  describe('Casos normales', () => {
    it('GET /caja/estado/:almacenId → CERRADA cuando no hay caja', async () => {
      const { almacenId, adminToken } = getCtx();

      const { status, body } = await get(`/caja/estado/${almacenId}`, adminToken);

      expect(status).toBe(200);
      expect(body.estado).toBe('CERRADA');
      expect(body.requiereAccion).toBe(true);
      expect(body.caja).toBeNull();
    });

    it('GET /caja/activa/:almacenId → null cuando no hay caja abierta', async () => {
      const { almacenId, adminToken } = getCtx();

      const res = await get(`/caja/activa/${almacenId}`, adminToken);

      expect(res.status).toBe(200);
      // NestJS serializa null como body vacío ("") en lugar de JSON null
      expect(res.body === null || res.body === '' || Object.keys(res.body ?? {}).length === 0).toBe(true);
    });

    it('POST /caja/abrir → abre caja con monto de apertura', async () => {
      const { almacenId, adminToken } = getCtx();

      const { status, body } = await post('/caja/abrir', adminToken, {
        almacenId,
        montoApertura: 200,
      });

      expect(status).toBe(201);
      expect(body.estado).toBe('ABIERTA');
      // Prisma Decimal se serializa como string en JSON
      expect(Number(body.montoApertura)).toBe(200);
      expect(body.almacen.id).toBe(almacenId);

      cajaId = body.id;
    });

    it('GET /caja/estado/:almacenId → ABIERTA_HOY después de abrir', async () => {
      const { almacenId, adminToken } = getCtx();

      const { status, body } = await get(`/caja/estado/${almacenId}`, adminToken);

      expect(status).toBe(200);
      expect(body.estado).toBe('ABIERTA_HOY');
      expect(body.requiereAccion).toBe(false);
      expect(body.caja.id).toBe(cajaId);
    });

    it('GET /caja/activa/:almacenId → retorna la caja abierta', async () => {
      const { almacenId, adminToken } = getCtx();

      const { status, body } = await get(`/caja/activa/${almacenId}`, adminToken);

      expect(status).toBe(200);
      expect(body.id).toBe(cajaId);
      expect(body.estado).toBe('ABIERTA');
    });

    it('POST /caja/abrir-dia/:almacenId → idempotente (retorna la misma caja)', async () => {
      const { almacenId, adminToken } = getCtx();

      const { status, body } = await post(`/caja/abrir-dia/${almacenId}`, adminToken);

      expect(status).toBe(201);
      expect(body.id).toBe(cajaId);
      expect(body.estado).toBe('ABIERTA');
    });

    it('POST /caja/:id/movimientos → registra movimiento INGRESO en caja abierta', async () => {
      const { adminToken } = getCtx();

      const { status, body } = await post(`/caja/${cajaId}/movimientos`, adminToken, {
        tipo: 'INGRESO',
        monto: 50,
        descripcion: 'Ingreso de prueba e2e',
      });

      expect(status).toBe(201);
      expect(body.cajaId).toBe(cajaId);
      expect(body.tipo).toBe('INGRESO');
      expect(Number(body.monto)).toBe(50);
    });

    it('POST /caja/:id/movimientos → registra movimiento EGRESO', async () => {
      const { adminToken } = getCtx();

      const { status, body } = await post(`/caja/${cajaId}/movimientos`, adminToken, {
        tipo: 'EGRESO',
        monto: 20,
      });

      expect(status).toBe(201);
      expect(body.tipo).toBe('EGRESO');
    });

    it('POST /caja/:id/movimientos → registra movimiento AJUSTE', async () => {
      const { adminToken } = getCtx();

      const { status, body } = await post(`/caja/${cajaId}/movimientos`, adminToken, {
        tipo: 'AJUSTE',
        monto: 5,
        descripcion: 'Ajuste e2e',
      });

      expect(status).toBe(201);
      expect(body.tipo).toBe('AJUSTE');
    });

    it('GET /caja/:id/movimientos → lista los movimientos registrados', async () => {
      const { adminToken } = getCtx();

      const { status, body } = await get(`/caja/${cajaId}/movimientos`, adminToken);

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(3);
      expect(body.every((m: any) => m.cajaId === cajaId)).toBe(true);
    });

    it('POST /caja/:id/cerrar → cierra la caja correctamente', async () => {
      const { adminToken } = getCtx();

      const { status, body } = await post(`/caja/${cajaId}/cerrar`, adminToken, {
        montoCierre: 230,
      });

      expect(status).toBe(201);
      expect(body.id).toBe(cajaId);
      expect(body.estado).toBe('CERRADA');
      expect(Number(body.montoCierre)).toBe(230);
    });

    it('GET /caja/estado/:almacenId → CERRADA después del cierre', async () => {
      const { almacenId, adminToken } = getCtx();

      const { status, body } = await get(`/caja/estado/${almacenId}`, adminToken);

      expect(status).toBe(200);
      expect(body.estado).toBe('CERRADA');
      expect(body.caja.id).toBe(cajaId);
    });

    it('GET /caja → lista todas las cajas de la empresa', async () => {
      const { adminToken } = getCtx();

      const { status, body } = await get('/caja', adminToken);

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const caja = body.find((c: any) => c.id === cajaId);
      expect(caja).toBeDefined();
      expect(caja.estado).toBe('CERRADA');
    });
  });

  // ── 2. Casos de permisos ──────────────────────────────────────────────────

  describe('Permisos', () => {
    it('GET /caja → 401 sin token', async () => {
      const { status } = await noAuth('get', '/caja');
      expect(status).toBe(401);
    });

    it('GET /caja/estado/:almacenId → 401 sin token', async () => {
      const { almacenId } = getCtx();
      const { status } = await noAuth('get', `/caja/estado/${almacenId}`);
      expect(status).toBe(401);
    });

    it('POST /caja/abrir → 401 sin token', async () => {
      const { almacenId } = getCtx();
      const { status } = await noAuth('post', '/caja/abrir', { almacenId, montoApertura: 100 });
      expect(status).toBe(401);
    });

    it('jefeVenta puede listar cajas (tiene CAJA:leer)', async () => {
      const { jefeVentaToken } = getCtx();

      const { status, body } = await get('/caja', jefeVentaToken);

      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it('jefeVenta puede consultar estado de caja (tiene CAJA:leer)', async () => {
      const { almacenId, jefeVentaToken } = getCtx();

      const { status, body } = await get(`/caja/estado/${almacenId}`, jefeVentaToken);

      expect(status).toBe(200);
      expect(body).toHaveProperty('estado');
    });

    it('jefeVenta puede abrir caja (tiene CAJA:crear)', async () => {
      const { almacenId, jefeVentaToken, adminToken } = getCtx();

      const { status, body } = await post('/caja/abrir', jefeVentaToken, {
        almacenId,
        montoApertura: 100,
      });

      expect(status).toBe(201);
      expect(body.estado).toBe('ABIERTA');

      // Cerrar para no dejar estado sucio
      await post(`/caja/${body.id}/cerrar`, adminToken, { montoCierre: 100 });
    });

    it('almacenero puede abrir caja (tiene CAJA:crear)', async () => {
      const { almacenId, almaceneroToken, adminToken } = getCtx();

      const { status, body } = await post('/caja/abrir', almaceneroToken, {
        almacenId,
        montoApertura: 50,
      });

      expect(status).toBe(201);
      expect(body.estado).toBe('ABIERTA');

      // Cerrar para no dejar estado sucio
      await post(`/caja/${body.id}/cerrar`, adminToken, { montoCierre: 50 });
    });
  });

  // ── 3. Casos borde / rotura ───────────────────────────────────────────────

  describe('Casos borde', () => {
    let cajaBordeId: number;

    beforeAll(async () => {
      // Abrir una caja limpia para los tests de borde
      const { almacenId, adminToken } = getCtx();
      const { body } = await post('/caja/abrir', adminToken, {
        almacenId,
        montoApertura: 100,
      });
      cajaBordeId = body.id;
    });

    afterAll(async () => {
      // Si la caja quedó abierta, cerrarla
      const { adminToken } = getCtx();
      await post(`/caja/${cajaBordeId}/cerrar`, adminToken, { montoCierre: 0 }).catch(() => {
        // ya puede estar cerrada
      });
    });

    it('POST /caja/abrir → 400 cuando ya hay una caja abierta', async () => {
      const { almacenId, adminToken } = getCtx();

      const { status, body } = await post('/caja/abrir', adminToken, {
        almacenId,
        montoApertura: 100,
      });

      expect(status).toBe(400);
      expect(body.message).toMatch(/ya existe/i);
    });

    it('POST /caja/:id/movimientos → 400 si la caja ya está cerrada', async () => {
      const { adminToken } = getCtx();

      // Cerrar la caja del grupo de casos normales (ya cerrada)
      const { status, body } = await post(`/caja/${cajaId}/movimientos`, adminToken, {
        tipo: 'INGRESO',
        monto: 10,
      });

      expect(status).toBe(400);
      expect(body.message).toMatch(/cerrada/i);
    });

    it('POST /caja/:id/cerrar → 400 si la caja ya está cerrada', async () => {
      const { adminToken } = getCtx();

      const { status, body } = await post(`/caja/${cajaId}/cerrar`, adminToken, {
        montoCierre: 100,
      });

      expect(status).toBe(400);
      expect(body.message).toMatch(/cerrada/i);
    });

    it('POST /caja/:id/cerrar → 404 para caja inexistente', async () => {
      const { adminToken } = getCtx();

      const { status } = await post('/caja/999999/cerrar', adminToken, {
        montoCierre: 100,
      });

      expect(status).toBe(404);
    });

    it('POST /caja/abrir-dia/:almacenId → 404 para almacén inexistente', async () => {
      const { adminToken } = getCtx();

      const { status } = await post('/caja/abrir-dia/999999', adminToken);

      expect(status).toBe(404);
    });

    it('POST /caja/abrir → 400 cuando falta almacenId en el body', async () => {
      const { adminToken } = getCtx();

      const { status } = await post('/caja/abrir', adminToken, {
        montoApertura: 100,
      });

      expect(status).toBe(400);
    });

    it('POST /caja/abrir → 400 cuando montoApertura es negativo', async () => {
      const { almacenId, adminToken } = getCtx();

      const { status } = await post('/caja/abrir', adminToken, {
        almacenId,
        montoApertura: -50,
      });

      expect(status).toBe(400);
    });

    it('POST /caja/:id/movimientos → 400 con monto negativo', async () => {
      const { adminToken } = getCtx();

      const { status } = await post(`/caja/${cajaBordeId}/movimientos`, adminToken, {
        tipo: 'INGRESO',
        monto: -10,
      });

      expect(status).toBe(400);
    });

    it('POST /caja/:id/movimientos → 400 con tipo inválido', async () => {
      const { adminToken } = getCtx();

      const { status } = await post(`/caja/${cajaBordeId}/movimientos`, adminToken, {
        tipo: 'INVALIDO',
        monto: 10,
      });

      expect(status).toBe(400);
    });

    it('POST /caja/abrir-dia/:almacenId idempotente llamado dos veces retorna misma caja', async () => {
      const { almacenId, adminToken } = getCtx();

      // Primera llamada — cierra la de borde y abre nueva
      await post(`/caja/${cajaBordeId}/cerrar`, adminToken, { montoCierre: 0 });

      const { body: body1 } = await post(`/caja/abrir-dia/${almacenId}`, adminToken);
      const { body: body2 } = await post(`/caja/abrir-dia/${almacenId}`, adminToken);

      expect(body1.id).toBe(body2.id);
      expect(body2.estado).toBe('ABIERTA');

      // Limpiar
      await post(`/caja/${body2.id}/cerrar`, adminToken, { montoCierre: 0 });
    });
  });
});
