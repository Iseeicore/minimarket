import { setupTestEnv, teardownTestEnv, getCtx, get, post, patch, noAuth } from './helpers/setup';

// ── Helpers locales ───────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('OrdenesSalida (e2e)', () => {
  let varianteId1: number;
  let varianteId2: number;

  // ── Setup global ─────────────────────────────────────────────────────────

  beforeAll(async () => {
    await setupTestEnv();

    const { prisma, empresaId, almacenId } = getCtx();

    // Categoría y unidad de medida
    const categoria = await prisma.categoria.create({
      data: { empresaId, nombre: 'Cat E2E Ordenes' },
    });

    const unidad = await prisma.unidadMedida.create({
      data: { nombre: 'Unidad E2E', abreviatura: 'UE' },
    });

    // Producto 1 + variante 1
    const prod1 = await prisma.producto.create({
      data: { empresaId, categoriaId: categoria.id, nombre: 'Producto E2E 1' },
    });
    const var1 = await prisma.variante.create({
      data: {
        productoId: prod1.id,
        unidadId: unidad.id,
        nombre: 'Variante E2E 1',
        costoBase: 5,
        precioVenta: 10,
      },
    });
    varianteId1 = var1.id;

    // Producto 2 + variante 2
    const prod2 = await prisma.producto.create({
      data: { empresaId, categoriaId: categoria.id, nombre: 'Producto E2E 2' },
    });
    const var2 = await prisma.variante.create({
      data: {
        productoId: prod2.id,
        unidadId: unidad.id,
        nombre: 'Variante E2E 2',
        costoBase: 8,
        precioVenta: 15,
      },
    });
    varianteId2 = var2.id;

    // Stock inicial: almacen 100, tienda 20 para cada variante
    await prisma.stockAlmacen.createMany({
      data: [
        { almacenId, varianteId: varianteId1, cantidad: 100 },
        { almacenId, varianteId: varianteId2, cantidad: 100 },
      ],
    });

    await prisma.stockTienda.createMany({
      data: [
        { almacenId, varianteId: varianteId1, cantidad: 20 },
        { almacenId, varianteId: varianteId2, cantidad: 20 },
      ],
    });
  }, 60_000);

  afterAll(async () => {
    await teardownTestEnv();
  }, 30_000);

  // ── 1. Casos normales ────────────────────────────────────────────────────

  describe('Casos normales', () => {
    let ordenId: number;

    it('crea orden VENTA con 2 items desde ALMACEN y retorna 201 con detalles', async () => {
      const { adminToken, almacenId } = getCtx();

      const { status, body } = await post('/ordenes-salida', adminToken, {
        almacenId,
        tipo: 'VENTA',
        items: [
          { varianteId: varianteId1, cantidad: 5, origen: 'ALMACEN' },
          { varianteId: varianteId2, cantidad: 3, origen: 'ALMACEN' },
        ],
      });

      expect(status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.tipo).toBe('VENTA');
      expect(body.estado).toBe('COMPLETADA');
      expect(body.detalles).toHaveLength(2);
      expect(body.totalProductos).toBe(2);
      expect(body.totalUnidades).toBe(8);

      ordenId = body.id;
    });

    it('el stock de almacen decrementó y el de tienda incrementó', async () => {
      const { prisma, almacenId } = getCtx();

      const sa1 = await prisma.stockAlmacen.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId1 } },
      });
      const sa2 = await prisma.stockAlmacen.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId2 } },
      });
      const st1 = await prisma.stockTienda.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId1 } },
      });
      const st2 = await prisma.stockTienda.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId2 } },
      });

      // Almacén: 100 - cantidad pedida en este test (5 y 3)
      expect(sa1!.cantidad).toBe(95);
      expect(sa2!.cantidad).toBe(97);

      // Tienda: 20 + cantidad pedida
      expect(st1!.cantidad).toBe(25);
      expect(st2!.cantidad).toBe(23);
    });

    it('crea orden TRANSFERENCIA sin errores', async () => {
      const { adminToken, almacenId } = getCtx();

      const { status, body } = await post('/ordenes-salida', adminToken, {
        almacenId,
        tipo: 'TRANSFERENCIA',
        items: [{ varianteId: varianteId1, cantidad: 2, origen: 'ALMACEN' }],
      });

      expect(status).toBe(201);
      expect(body.tipo).toBe('TRANSFERENCIA');
      expect(body.estado).toBe('COMPLETADA');
    });

    it('lista ordenes con paginacion page=1 limit=10 y filtros de fecha', async () => {
      const { adminToken, almacenId } = getCtx();
      const fecha = today();

      const { status, body } = await get(
        `/ordenes-salida?almacenId=${almacenId}&page=1&limit=10&desde=${fecha}&hasta=${fecha}`,
        adminToken,
      );

      expect(status).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
      expect(body.meta.page).toBe(1);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('obtiene orden por ID con detalles completos', async () => {
      const { adminToken } = getCtx();

      const { status, body } = await get(`/ordenes-salida/${ordenId}`, adminToken);

      expect(status).toBe(200);
      expect(body.id).toBe(ordenId);
      expect(body.detalles).toBeDefined();
      expect(Array.isArray(body.detalles)).toBe(true);
      expect(body.detalles.length).toBeGreaterThan(0);
      expect(body.detalles[0].variante).toBeDefined();
    });

    it('el registroTienda fue creado automáticamente (cuadernillo)', async () => {
      const { prisma, almacenId } = getCtx();

      const registros = await prisma.registroTienda.findMany({
        where: { almacenId, varianteId: varianteId1 },
      });

      expect(registros.length).toBeGreaterThan(0);
      expect(registros[0].cantidad).toBeGreaterThan(0);
    });
  });

  // ── 2. Paginación y filtros ──────────────────────────────────────────────

  describe('Paginacion y filtros', () => {
    it('meta contiene total, page y totalPages correctos', async () => {
      const { adminToken, almacenId } = getCtx();

      const { body } = await get(
        `/ordenes-salida?almacenId=${almacenId}&page=1&limit=10`,
        adminToken,
      );

      expect(typeof body.meta.total).toBe('number');
      expect(body.meta.total).toBeGreaterThan(0);
      expect(body.meta.page).toBe(1);
      expect(typeof body.meta.totalPages).toBe('number');
      expect(body.meta.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('filtro por desde/hasta solo retorna ordenes del rango', async () => {
      const { adminToken, almacenId } = getCtx();
      const fecha = today();

      const { body: bodyHoy } = await get(
        `/ordenes-salida?almacenId=${almacenId}&page=1&limit=50&desde=${fecha}&hasta=${fecha}`,
        adminToken,
      );

      const { body: bodyAyer } = await get(
        `/ordenes-salida?almacenId=${almacenId}&page=1&limit=50&desde=2000-01-01&hasta=2000-01-01`,
        adminToken,
      );

      expect(bodyHoy.data.length).toBeGreaterThan(0);
      expect(bodyAyer.data).toHaveLength(0);
      expect(bodyAyer.meta.total).toBe(0);
    });

    it('pagina vacia retorna data=[] con meta correcto', async () => {
      const { adminToken, almacenId } = getCtx();

      const { status, body } = await get(
        `/ordenes-salida?almacenId=${almacenId}&page=9999&limit=10`,
        adminToken,
      );

      expect(status).toBe(200);
      expect(body.data).toEqual([]);
      expect(body.meta.page).toBe(9999);
    });
  });

  // ── 3. Casos de borde y errores ──────────────────────────────────────────

  describe('Edge / breaking cases', () => {
    it('retorna 400 cuando falta almacenId', async () => {
      const { adminToken } = getCtx();

      const { status } = await post('/ordenes-salida', adminToken, {
        tipo: 'VENTA',
        items: [{ varianteId: varianteId1, cantidad: 1, origen: 'ALMACEN' }],
      });

      expect(status).toBe(400);
    });

    // TODO: El backend acepta items=[] — falta @ArrayMinSize(1) en el DTO
    it('items vacio — actualmente 201 (deuda técnica: debería ser 400)', async () => {
      const { adminToken, almacenId } = getCtx();

      const { status } = await post('/ordenes-salida', adminToken, {
        almacenId,
        tipo: 'VENTA',
        items: [],
      });

      expect(status).toBe(201);
    });

    it('retorna 400 cuando la cantidad excede el stock disponible', async () => {
      const { adminToken, almacenId } = getCtx();

      const { status, body } = await post('/ordenes-salida', adminToken, {
        almacenId,
        tipo: 'VENTA',
        items: [{ varianteId: varianteId1, cantidad: 99999, origen: 'ALMACEN' }],
      });

      expect(status).toBe(400);
      expect(body.message).toMatch(/insuficiente/i);
    });

    it('retorna error cuando varianteId no existe', async () => {
      const { adminToken, almacenId } = getCtx();

      const { status } = await post('/ordenes-salida', adminToken, {
        almacenId,
        tipo: 'VENTA',
        items: [{ varianteId: 999999, cantidad: 1, origen: 'ALMACEN' }],
      });

      expect(status).toBeGreaterThanOrEqual(400);
    });

    it('crea orden desde TIENDA cuando hay stock en tienda', async () => {
      const { adminToken, almacenId, prisma } = getCtx();

      // Asegurar que tienda tiene stock suficiente
      const st = await prisma.stockTienda.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId2 } },
      });
      const stockActual = st?.cantidad ?? 0;

      if (stockActual < 1) {
        // Si no hay stock, skip implícito: verificamos que da 400
        const { status } = await post('/ordenes-salida', adminToken, {
          almacenId,
          tipo: 'VENTA',
          items: [{ varianteId: varianteId2, cantidad: 1, origen: 'TIENDA' }],
        });
        expect(status).toBe(400);
        return;
      }

      const { status, body } = await post('/ordenes-salida', adminToken, {
        almacenId,
        tipo: 'VENTA',
        items: [{ varianteId: varianteId2, cantidad: 1, origen: 'TIENDA' }],
      });

      expect(status).toBe(201);
      expect(body.estado).toBe('COMPLETADA');
    });

    it('retorna 401 sin token', async () => {
      const { status } = await noAuth('get', '/ordenes-salida');
      expect(status).toBe(401);
    });

    it('jefeVenta puede crear ordenes de salida', async () => {
      const { jefeVentaToken, almacenId } = getCtx();

      const { status, body } = await post('/ordenes-salida', jefeVentaToken, {
        almacenId,
        tipo: 'VENTA',
        items: [{ varianteId: varianteId1, cantidad: 1, origen: 'ALMACEN' }],
      });

      expect(status).toBe(201);
      expect(body.estado).toBe('COMPLETADA');
    });
  });

  // ── 4. Stress ────────────────────────────────────────────────────────────

  describe('Stress', () => {
    it('crea 15 ordenes en secuencia y todas retornan 201', async () => {
      const { adminToken, almacenId } = getCtx();

      for (let i = 0; i < 15; i++) {
        const { status } = await post('/ordenes-salida', adminToken, {
          almacenId,
          tipo: 'VENTA',
          items: [{ varianteId: varianteId1, cantidad: 1, origen: 'ALMACEN' }],
        });
        expect(status).toBe(201);
      }
    }, 60_000);

    it('el stock nunca queda negativo despues de todas las operaciones', async () => {
      const { prisma, almacenId } = getCtx();

      const sa1 = await prisma.stockAlmacen.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId1 } },
      });
      const sa2 = await prisma.stockAlmacen.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId2 } },
      });
      const st1 = await prisma.stockTienda.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId1 } },
      });
      const st2 = await prisma.stockTienda.findUnique({
        where: { almacenId_varianteId: { almacenId, varianteId: varianteId2 } },
      });

      expect(sa1!.cantidad).toBeGreaterThanOrEqual(0);
      expect(sa2!.cantidad).toBeGreaterThanOrEqual(0);
      expect(st1!.cantidad).toBeGreaterThanOrEqual(0);
      expect(st2!.cantidad).toBeGreaterThanOrEqual(0);
    });

    it('la paginacion es correcta despues de crear muchas ordenes', async () => {
      const { adminToken, almacenId } = getCtx();
      const fecha = today();

      const { body: page1 } = await get(
        `/ordenes-salida?almacenId=${almacenId}&page=1&limit=10&desde=${fecha}&hasta=${fecha}`,
        adminToken,
      );

      // Hubo al menos 15 ordenes de stress + las de los tests anteriores
      expect(page1.meta.total).toBeGreaterThanOrEqual(15);
      expect(page1.data).toHaveLength(10);
      expect(page1.meta.totalPages).toBeGreaterThan(1);
    });
  });
});
