import { setupTestEnv, teardownTestEnv, getCtx, get, post, patch, noAuth } from './helpers/setup';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures locales de esta suite
// ─────────────────────────────────────────────────────────────────────────────

let varianteId1: number;
let varianteId2: number;
let registroIds: number[] = [];

import { todayLima } from '../src/common/utils/timezone';
const TODAY = todayLima();

// ─────────────────────────────────────────────────────────────────────────────

describe('RegistrosTienda (e2e)', () => {
  beforeAll(async () => {
    await setupTestEnv();
    const { prisma, empresaId, almacenId } = getCtx();

    // 1. Categoria
    const categoria = await prisma.categoria.create({
      data: { empresaId, nombre: 'Cat RT E2E' },
    });

    // 2. Unidad
    const unidad = await prisma.unidadMedida.create({
      data: { nombre: 'Unidad RT E2E', abreviatura: 'u' },
    });

    // 3. Productos + variantes
    const prod1 = await prisma.producto.create({
      data: { empresaId, categoriaId: categoria.id, nombre: 'Producto RT 1' },
    });
    const prod2 = await prisma.producto.create({
      data: { empresaId, categoriaId: categoria.id, nombre: 'Producto RT 2' },
    });

    const var1 = await prisma.variante.create({
      data: {
        productoId: prod1.id,
        unidadId: unidad.id,
        nombre: 'Variante RT 1',
        costoBase: 5,
        precioVenta: 10,
        stockMinimo: 2,
      },
    });
    const var2 = await prisma.variante.create({
      data: {
        productoId: prod2.id,
        unidadId: unidad.id,
        nombre: 'Variante RT 2',
        costoBase: 8,
        precioVenta: 15,
        stockMinimo: 1,
      },
    });

    varianteId1 = var1.id;
    varianteId2 = var2.id;

    // 4. Stock inicial (necesario para no romper otras queries)
    await prisma.stockAlmacen.createMany({
      data: [
        { almacenId, varianteId: varianteId1, cantidad: 100 },
        { almacenId, varianteId: varianteId2, cantidad: 100 },
      ],
    });
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  // ── 1. Normal ──────────────────────────────────────────────────────────────

  describe('Flujo normal', () => {
    it('POST /registros-tienda — crea 3 SALIDA y 2 TRANSFERENCIA', async () => {
      const { jefeVentaToken, almacenId } = getCtx();

      const payloads = [
        { almacenId, varianteId: varianteId1, cantidad: 3, tipo: 'SALIDA', notas: 'Salida 1' },
        { almacenId, varianteId: varianteId1, cantidad: 2, tipo: 'SALIDA', notas: 'Salida 2' },
        { almacenId, varianteId: varianteId2, cantidad: 4, tipo: 'SALIDA', notas: 'Salida 3' },
        { almacenId, varianteId: varianteId1, cantidad: 1, tipo: 'TRANSFERENCIA', notas: 'Transfer 1' },
        { almacenId, varianteId: varianteId2, cantidad: 5, tipo: 'TRANSFERENCIA', notas: 'Transfer 2' },
      ];

      for (const payload of payloads) {
        const { status, body } = await post('/registros-tienda', jefeVentaToken, payload);
        expect(status).toBe(201);
        expect(body.id).toBeDefined();
        expect(body.tipo).toBe(payload.tipo);
        expect(body.cantidad).toBe(payload.cantidad);
        expect(body.devuelto).toBe(false);
        registroIds.push(body.id);
      }
    });

    it('GET /registros-tienda — lista todos los activos', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda?almacenId=${almacenId}`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(body.meta).toBeDefined();
      expect(body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('GET /registros-tienda/:id — retorna registro por id', async () => {
      const { jefeVentaToken } = getCtx();
      const id = registroIds[0];
      const { status, body } = await get(`/registros-tienda/${id}`, jefeVentaToken);
      expect(status).toBe(200);
      expect(body.id).toBe(id);
      expect(body.variante).toBeDefined();
      expect(body.almacen).toBeDefined();
      expect(body.usuario).toBeDefined();
    });

    it('GET /registros-tienda/conteo-por-dia — retorna conteo del rango', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda/conteo-por-dia?almacenId=${almacenId}&desde=${TODAY}&hasta=${TODAY}`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(body[TODAY]).toBeGreaterThanOrEqual(5);
    });

    it('GET /registros-tienda/resumen-dia — agrupa por variante sumando cantidades', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda/resumen-dia?almacenId=${almacenId}&fecha=${TODAY}`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(body.meta).toBeDefined();
      // Solo hay 2 variantes únicas
      expect(body.data.length).toBe(2);
      for (const item of body.data) {
        expect(item.varianteId).toBeDefined();
        expect(item.totalCantidad).toBeGreaterThan(0);
        expect(item.variante).toBeDefined();
      }
    });

    it('GET /registros-tienda/resumen-dia por tipo SALIDA — solo agrupa SALIDAs', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda/resumen-dia?almacenId=${almacenId}&fecha=${TODAY}&tipo=SALIDA`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      // varianteId1: 3+2=5, varianteId2: 4
      const item1 = body.data.find((i: any) => i.varianteId === varianteId1);
      const item2 = body.data.find((i: any) => i.varianteId === varianteId2);
      expect(item1?.totalCantidad).toBe(5);
      expect(item2?.totalCantidad).toBe(4);
    });

    it('GET /registros-tienda/resumen-dia por tipo TRANSFERENCIA — solo agrupa TRANSFERENCIAs', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda/resumen-dia?almacenId=${almacenId}&fecha=${TODAY}&tipo=TRANSFERENCIA`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      // varianteId1: 1, varianteId2: 5
      const item1 = body.data.find((i: any) => i.varianteId === varianteId1);
      const item2 = body.data.find((i: any) => i.varianteId === varianteId2);
      expect(item1?.totalCantidad).toBe(1);
      expect(item2?.totalCantidad).toBe(5);
    });
  });

  // ── 2. Paginación ──────────────────────────────────────────────────────────

  describe('Paginación', () => {
    it('GET /registros-tienda?page=1&limit=2 — meta correcta', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda?almacenId=${almacenId}&page=1&limit=2`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(body.data.length).toBe(2);
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(2);
      expect(body.meta.total).toBeGreaterThanOrEqual(5);
      expect(body.meta.totalPages).toBeGreaterThanOrEqual(3);
    });

    it('GET /registros-tienda?page=2&limit=2 — segunda página distinta a la primera', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status: s1, body: b1 } = await get(
        `/registros-tienda?almacenId=${almacenId}&page=1&limit=2`,
        jefeVentaToken,
      );
      const { status: s2, body: b2 } = await get(
        `/registros-tienda?almacenId=${almacenId}&page=2&limit=2`,
        jefeVentaToken,
      );
      expect(s1).toBe(200);
      expect(s2).toBe(200);
      const ids1 = b1.data.map((r: any) => r.id);
      const ids2 = b2.data.map((r: any) => r.id);
      expect(ids1).not.toEqual(ids2);
    });

    it('GET /registros-tienda — página fuera de rango retorna data vacía', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda?almacenId=${almacenId}&page=9999&limit=20`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(body.data.length).toBe(0);
    });
  });

  // ── 3. Resumen-dia: agrupación de cantidades ────────────────────────────────

  describe('Resumen-dia: agrupación de cantidades', () => {
    it('misma variante en múltiples registros aparece como 1 entrada con total sumado', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda/resumen-dia?almacenId=${almacenId}&fecha=${TODAY}&tipo=SALIDA`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      // varianteId1 tiene 2 registros SALIDA (3+2 = 5) — debe aparecer 1 sola vez
      const entries = body.data.filter((i: any) => i.varianteId === varianteId1);
      expect(entries.length).toBe(1);
      expect(entries[0].totalCantidad).toBe(5);
    });

    it('resultado paginado tiene campos meta correctos', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda/resumen-dia?almacenId=${almacenId}&fecha=${TODAY}&page=1&limit=1`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(body.data.length).toBe(1);
      expect(body.meta.page).toBe(1);
      expect(body.meta.limit).toBe(1);
      expect(body.meta.total).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 4. Edge cases ──────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('PATCH /registros-tienda/:id/devolver — marca como devuelto y lo excluye del listado', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const idADevolver = registroIds[4]; // último TRANSFERENCIA

      const { status, body } = await patch(
        `/registros-tienda/${idADevolver}/devolver`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(body.devuelto).toBe(true);

      // Verificar que ya no aparece en el listado activo
      const { body: listado } = await get(
        `/registros-tienda?almacenId=${almacenId}`,
        jefeVentaToken,
      );
      const ids = listado.data.map((r: any) => r.id);
      expect(ids).not.toContain(idADevolver);
    });

    it('PATCH /registros-tienda/:id/devolver — doble devuelto retorna 400', async () => {
      const { jefeVentaToken } = getCtx();
      const idYaDevuelto = registroIds[4];

      const { status } = await patch(
        `/registros-tienda/${idYaDevuelto}/devolver`,
        jefeVentaToken,
      );
      expect(status).toBe(400);
    });

    it('GET /registros-tienda/conteo-por-dia — almacenId inválido retorna 404', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await get(
        `/registros-tienda/conteo-por-dia?almacenId=999999&desde=${TODAY}&hasta=${TODAY}`,
        jefeVentaToken,
      );
      expect(status).toBe(404);
    });

    it('GET /registros-tienda/resumen-dia — almacenId inválido retorna 404', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await get(
        `/registros-tienda/resumen-dia?almacenId=999999&fecha=${TODAY}`,
        jefeVentaToken,
      );
      expect(status).toBe(404);
    });

    it('GET /registros-tienda/conteo-por-dia — rango sin actividad retorna objeto vacío', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda/conteo-por-dia?almacenId=${almacenId}&desde=2000-01-01&hasta=2000-01-31`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(Object.keys(body).length).toBe(0);
    });

    it('GET /registros-tienda/resumen-dia — día sin registros retorna data vacía', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const { status, body } = await get(
        `/registros-tienda/resumen-dia?almacenId=${almacenId}&fecha=2000-01-01`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      expect(body.data.length).toBe(0);
    });

    it('GET /registros-tienda/:id — id inexistente retorna 404', async () => {
      const { jefeVentaToken } = getCtx();
      const { status } = await get('/registros-tienda/999999', jefeVentaToken);
      expect(status).toBe(404);
    });

    it('POST /registros-tienda — variante inactiva retorna 404', async () => {
      const { jefeVentaToken, almacenId, prisma } = getCtx();

      // Crear variante inactiva temporal
      const varRef = await prisma.variante.findUnique({
        where: { id: varianteId1 },
        select: { productoId: true, unidadId: true },
      });
      const inactiva = await prisma.variante.create({
        data: {
          productoId: varRef!.productoId,
          unidadId: varRef!.unidadId,
          nombre: 'Variante Inactiva E2E',
          activo: false,
        },
      });

      const { status } = await post('/registros-tienda', jefeVentaToken, {
        almacenId,
        varianteId: inactiva.id,
        cantidad: 1,
        tipo: 'SALIDA',
      });
      expect(status).toBe(404);
    });

    it('GET /registros-tienda — sin token retorna 401', async () => {
      const { status } = await noAuth('get', '/registros-tienda');
      expect(status).toBe(401);
    });

    it('GET /registros-tienda/conteo-por-dia — rango de varios días refleja conteo correcto', async () => {
      const { jefeVentaToken, almacenId } = getCtx();
      const ayer = (() => { const d = new Date(Date.now() - 86400000 - 5*60*60*1000); return d.toISOString().slice(0, 10); })();
      const { status, body } = await get(
        `/registros-tienda/conteo-por-dia?almacenId=${almacenId}&desde=${ayer}&hasta=${TODAY}`,
        jefeVentaToken,
      );
      expect(status).toBe(200);
      // Hoy debe tener registros (los creados en "flujo normal" menos el devuelto)
      expect(body[TODAY]).toBeGreaterThanOrEqual(4);
    });
  });
});
