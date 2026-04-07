import { setupTestEnv, teardownTestEnv, getCtx, get, post, noAuth } from './helpers/setup';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures locales de esta suite
// ─────────────────────────────────────────────────────────────────────────────

let varianteId1: number;
let varianteId2: number;
let stockAlmacenId: number;

const STOCK_INICIAL = 50;

// ─────────────────────────────────────────────────────────────────────────────

describe('Stock (e2e)', () => {
  beforeAll(async () => {
    await setupTestEnv();
    const { prisma, empresaId, almacenId } = getCtx();

    // 1. Categoría + Unidad
    const categoria = await prisma.categoria.create({
      data: { empresaId, nombre: 'Cat Stock E2E' },
    });
    const unidad = await prisma.unidadMedida.create({
      data: { nombre: 'Unidad Stock E2E', abreviatura: 'u' },
    });

    // 2. Productos + variantes
    const prod1 = await prisma.producto.create({
      data: { empresaId, categoriaId: categoria.id, nombre: 'Producto Stock 1' },
    });
    const prod2 = await prisma.producto.create({
      data: { empresaId, categoriaId: categoria.id, nombre: 'Producto Stock 2' },
    });

    const var1 = await prisma.variante.create({
      data: {
        productoId: prod1.id,
        unidadId: unidad.id,
        nombre: 'Variante Stock 1',
        costoBase: 10,
        precioVenta: 20,
        stockMinimo: 5,
      },
    });
    const var2 = await prisma.variante.create({
      data: {
        productoId: prod2.id,
        unidadId: unidad.id,
        nombre: 'Variante Stock 2',
        costoBase: 15,
        precioVenta: 30,
        stockMinimo: 3,
      },
    });

    varianteId1 = var1.id;
    varianteId2 = var2.id;

    // 3. Stock inicial en almacén
    const sa = await prisma.stockAlmacen.create({
      data: { almacenId, varianteId: varianteId1, cantidad: STOCK_INICIAL },
    });
    await prisma.stockAlmacen.create({
      data: { almacenId, varianteId: varianteId2, cantidad: STOCK_INICIAL },
    });

    stockAlmacenId = sa.id;
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  // ── 1. Normal: estado inicial del stock ────────────────────────────────────

  describe('Estado inicial', () => {
    it('GET /stock — retorna todo el stock de la empresa', async () => {
      const { adminToken } = getCtx();
      const { status, body } = await get('/stock', adminToken);
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      const item = body[0];
      expect(item.almacen).toBeDefined();
      expect(item.variante).toBeDefined();
      expect(item.cantidad).toBeDefined();
    });

    it('GET /stock/:id — retorna stock por id con variante y almacen', async () => {
      const { adminToken } = getCtx();
      const { status, body } = await get(`/stock/${stockAlmacenId}`, adminToken);
      expect(status).toBe(200);
      expect(body.id).toBe(stockAlmacenId);
      expect(body.variante).toBeDefined();
      expect(body.almacen).toBeDefined();
    });

    it('GET /stock/almacen/:almacenId — retorna stock del almacén específico', async () => {
      const { adminToken, almacenId } = getCtx();
      const { status, body } = await get(`/stock/almacen/${almacenId}`, adminToken);
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /stock/dual/:almacenId — retorna campos almacen + tienda + total + indicadores', async () => {
      const { adminToken, almacenId } = getCtx();
      const { status, body } = await get(`/stock/dual/${almacenId}`, adminToken);
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);

      const item = body.find((s: any) => s.varianteId === varianteId1);
      expect(item).toBeDefined();
      expect(item.almacen).toBe(STOCK_INICIAL);
      expect(item.tienda).toBe(0);
      expect(item.total).toBe(STOCK_INICIAL);
      expect(item.variante).toBeDefined();
      expect(item.stockMinimo).toBe(5);
    });

    it('GET /stock/dual/:almacenId — inicioHoy / salidaHoy / ingresoHoy en cero al inicio', async () => {
      const { adminToken, almacenId } = getCtx();
      const { status, body } = await get(`/stock/dual/${almacenId}`, adminToken);
      expect(status).toBe(200);

      const item = body.find((s: any) => s.varianteId === varianteId1);
      expect(item.salidaHoy).toBe(0);
      expect(item.ingresoHoy).toBe(0);
      // inicioHoy = max(total + salidaHoy - ingresoHoy, 1) = max(STOCK_INICIAL, 1)
      expect(item.inicioHoy).toBe(STOCK_INICIAL);
    });

    it('GET /stock/movimientos — retorna paginado con meta', async () => {
      const { adminToken } = getCtx();
      const { status, body } = await get('/stock/movimientos?page=1&limit=20', adminToken);
      expect(status).toBe(200);
      expect(body.meta).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ── 2. Después de una orden-salida ─────────────────────────────────────────

  describe('Después de crear una orden-salida', () => {
    const CANTIDAD_SALIDA = 10;

    beforeAll(async () => {
      const { jefeVentaToken, almacenId } = getCtx();

      // Crear orden de salida tipo VENTA origen ALMACEN
      const { status } = await post('/ordenes-salida', jefeVentaToken, {
        almacenId,
        tipo: 'VENTA',
        items: [
          { varianteId: varianteId1, cantidad: CANTIDAD_SALIDA, origen: 'ALMACEN' },
        ],
      });
      expect(status).toBe(201);
    });

    it('stock dual: almacen decrementó en la cantidad salida', async () => {
      const { adminToken, almacenId } = getCtx();
      const { status, body } = await get(`/stock/dual/${almacenId}`, adminToken);
      expect(status).toBe(200);

      const item = body.find((s: any) => s.varianteId === varianteId1);
      expect(item.almacen).toBe(STOCK_INICIAL - CANTIDAD_SALIDA);
    });

    it('stock dual: tienda incrementó en la cantidad salida', async () => {
      const { adminToken, almacenId } = getCtx();
      const { body } = await get(`/stock/dual/${almacenId}`, adminToken);

      const item = body.find((s: any) => s.varianteId === varianteId1);
      expect(item.tienda).toBe(CANTIDAD_SALIDA);
    });

    it('stock dual: total se mantiene igual (solo se movió entre almacen y tienda)', async () => {
      const { adminToken, almacenId } = getCtx();
      const { body } = await get(`/stock/dual/${almacenId}`, adminToken);

      const item = body.find((s: any) => s.varianteId === varianteId1);
      expect(item.total).toBe(STOCK_INICIAL);
    });

    it('stock dual: salidaHoy > 0 después de la orden', async () => {
      const { adminToken, almacenId } = getCtx();
      const { body } = await get(`/stock/dual/${almacenId}`, adminToken);

      const item = body.find((s: any) => s.varianteId === varianteId1);
      expect(item.salidaHoy).toBeGreaterThanOrEqual(CANTIDAD_SALIDA);
    });

    it('stock dual: inicioHoy refleja stock real al inicio del día', async () => {
      const { adminToken, almacenId } = getCtx();
      const { body } = await get(`/stock/dual/${almacenId}`, adminToken);

      const item = body.find((s: any) => s.varianteId === varianteId1);
      // inicioHoy = total + salidaHoy - ingresoHoy >= 1
      const esperado = Math.max(item.total + item.salidaHoy - item.ingresoHoy, 1);
      expect(item.inicioHoy).toBe(esperado);
    });

    it('GET /stock/movimientos?almacenId= — registra movimiento de la orden', async () => {
      const { adminToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/stock/movimientos?almacenId=${almacenId}&page=1&limit=20`,
        adminToken,
      );
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThan(0);
      const mov = body.data.find(
        (m: any) => m.varianteId === varianteId1 && m.tipo === 'ORDEN_SALIDA',
      );
      expect(mov).toBeDefined();
      expect(mov.cantidad).toBe(-CANTIDAD_SALIDA);
    });
  });

  // ── 3. Edge cases ──────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('GET /stock/dual/:almacenId — almacenId inválido retorna array vacío', async () => {
      const { adminToken } = getCtx();
      const { status, body } = await get('/stock/dual/999999', adminToken);
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    it('GET /stock/:id — id inexistente retorna 404', async () => {
      const { adminToken } = getCtx();
      const { status } = await get('/stock/999999', adminToken);
      expect(status).toBe(404);
    });

    it('GET /stock/movimientos — paginación: page=2 con limit=1 retorna segunda entrada', async () => {
      const { adminToken, almacenId } = getCtx();
      const { status: s1, body: b1 } = await get(
        `/stock/movimientos?almacenId=${almacenId}&page=1&limit=1`,
        adminToken,
      );
      const { status: s2, body: b2 } = await get(
        `/stock/movimientos?almacenId=${almacenId}&page=2&limit=1`,
        adminToken,
      );
      expect(s1).toBe(200);
      expect(s2).toBe(200);
      if (b1.meta.total > 1) {
        expect(b1.data[0]?.id).not.toBe(b2.data[0]?.id);
      }
    });

    it('GET /stock/movimientos — filtra por almacenId correctamente', async () => {
      const { adminToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/stock/movimientos?almacenId=${almacenId}`,
        adminToken,
      );
      expect(status).toBe(200);
      for (const mov of body.data) {
        expect(mov.almacen.id).toBe(almacenId);
      }
    });

    it('GET /stock — 401 sin token', async () => {
      const { status } = await noAuth('get', '/stock');
      expect(status).toBe(401);
    });

    it('GET /stock/dual/:almacenId — 401 sin token', async () => {
      const { almacenId } = getCtx();
      const { status } = await noAuth('get', `/stock/dual/${almacenId}`);
      expect(status).toBe(401);
    });

    it('GET /stock/movimientos — 401 sin token', async () => {
      const { status } = await noAuth('get', '/stock/movimientos');
      expect(status).toBe(401);
    });
  });
});
