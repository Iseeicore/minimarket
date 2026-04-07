import request from 'supertest';
import * as ExcelJS from 'exceljs';
import { setupTestEnv, teardownTestEnv, getCtx } from './helpers/setup';

const API = '/api/v1';

// ── Helpers para generar Excel en memoria ────────────────────────────────────

async function buildExcel(options?: {
  categorias?: { nombre: string; descripcion?: string }[];
  productos?: { nombre: string; categoria: string }[];
  variantes?: Record<string, any>[];
  skipSheet?: 'Categorias' | 'Productos' | 'Variantes';
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const cats = options?.categorias ?? [
    { nombre: 'Bebidas E2E', descripcion: 'Bebidas de prueba' },
    { nombre: 'Snacks E2E', descripcion: 'Snacks de prueba' },
  ];
  const prods = options?.productos ?? [
    { nombre: 'Agua E2E', categoria: 'Bebidas E2E' },
    { nombre: 'Galleta E2E', categoria: 'Snacks E2E' },
  ];
  const vars = options?.variantes ?? [
    { producto: 'Agua E2E', nombre: '500 ML', unidad: 'UN', sku: 'E2E-AGUA-500', costoBase: 1, precioVenta: 2, stockMinimo: 10, stockAlmacen: 50, stockTienda: 10 },
    { producto: 'Agua E2E', nombre: '1.5 LT', unidad: 'UN', sku: 'E2E-AGUA-1.5', costoBase: 2.5, precioVenta: 4, stockMinimo: 5, stockAlmacen: 30, stockTienda: 6 },
    { producto: 'Galleta E2E', nombre: 'Pack x6', unidad: 'UN', sku: 'E2E-GALL-PK6', costoBase: 3, precioVenta: 5, stockMinimo: 12, stockAlmacen: 40, stockTienda: 8 },
  ];

  if (options?.skipSheet !== 'Categorias') {
    const sheet = wb.addWorksheet('Categorias');
    sheet.columns = [
      { header: 'nombre', key: 'nombre' },
      { header: 'descripcion', key: 'descripcion' },
    ];
    cats.forEach((c) => sheet.addRow(c));
  }

  if (options?.skipSheet !== 'Productos') {
    const sheet = wb.addWorksheet('Productos');
    sheet.columns = [
      { header: 'nombre', key: 'nombre' },
      { header: 'categoria', key: 'categoria' },
    ];
    prods.forEach((p) => sheet.addRow(p));
  }

  if (options?.skipSheet !== 'Variantes') {
    const sheet = wb.addWorksheet('Variantes');
    sheet.columns = [
      { header: 'producto', key: 'producto' },
      { header: 'nombre', key: 'nombre' },
      { header: 'unidad', key: 'unidad' },
      { header: 'sku', key: 'sku' },
      { header: 'costoBase', key: 'costoBase' },
      { header: 'precioVenta', key: 'precioVenta' },
      { header: 'stockMinimo', key: 'stockMinimo' },
      { header: 'stockAlmacen', key: 'stockAlmacen' },
      { header: 'stockTienda', key: 'stockTienda' },
    ];
    vars.forEach((v) => sheet.addRow(v));
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
}

function uploadCatalogo(app: any, token: string, almacenId: number, fileBuffer: Buffer, filename = 'test.xlsx') {
  return request(app.getHttpServer())
    .post(`${API}/carga-masiva/catalogo?almacenId=${almacenId}`)
    .set('Authorization', `Bearer ${token}`)
    .attach('archivo', fileBuffer, filename);
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('Carga Masiva (e2e)', () => {
  beforeAll(async () => {
    await setupTestEnv();
    const { prisma, empresaId } = getCtx();

    // Crear unidad "UN" si no existe (otros tests pueden haberla creado)
    const existing = await prisma.unidadMedida.findFirst({ where: { abreviatura: 'UN' } });
    if (!existing) {
      await prisma.unidadMedida.create({ data: { nombre: 'Unidad', abreviatura: 'UN' } });
    }
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('POST /carga-masiva/catalogo — carga exitosa', () => {
    it('crea categorías, productos, variantes y stock desde Excel', async () => {
      const { app, adminToken, almacenId } = getCtx();
      const excel = await buildExcel();

      const { status, body } = await uploadCatalogo(app, adminToken, almacenId, excel);

      expect(status).toBe(201);
      expect(body).toEqual({
        categorias: 2,
        productos: 2,
        variantes: 3,
        stockAlmacen: 3,
        stockTienda: 3,
      });
    });

    it('los datos existen en la base de datos', async () => {
      const { prisma, empresaId, almacenId } = getCtx();

      const cats = await prisma.categoria.findMany({
        where: { empresaId, nombre: { contains: 'E2E' } },
      });
      expect(cats.length).toBe(2);

      const prods = await prisma.producto.findMany({
        where: { empresaId, nombre: { contains: 'E2E' } },
      });
      expect(prods.length).toBe(2);

      const variantes = await prisma.variante.findMany({
        where: { sku: { startsWith: 'E2E-' } },
      });
      expect(variantes.length).toBe(3);

      // Verificar stock
      for (const v of variantes) {
        const sa = await prisma.stockAlmacen.findUnique({
          where: { almacenId_varianteId: { almacenId, varianteId: v.id } },
        });
        expect(sa).not.toBeNull();
        expect(sa!.cantidad).toBeGreaterThan(0);

        const st = await prisma.stockTienda.findUnique({
          where: { almacenId_varianteId: { almacenId, varianteId: v.id } },
        });
        expect(st).not.toBeNull();
        expect(st!.cantidad).toBeGreaterThan(0);
      }
    });
  });

  // ── Autenticación y autorización ───────────────────────────────────────────

  describe('Permisos', () => {
    it('rechaza sin token (401)', async () => {
      const { app, almacenId } = getCtx();
      const excel = await buildExcel();

      const { status } = await request(app.getHttpServer())
        .post(`${API}/carga-masiva/catalogo?almacenId=${almacenId}`)
        .attach('archivo', excel, 'test.xlsx');

      expect(status).toBe(401);
    });

    it('rechaza ALMACENERO (403)', async () => {
      const { app, almaceneroToken, almacenId } = getCtx();
      const excel = await buildExcel();

      const { status } = await uploadCatalogo(app, almaceneroToken, almacenId, excel);

      expect(status).toBe(403);
    });

    it('rechaza JEFE_VENTA (403)', async () => {
      const { app, jefeVentaToken, almacenId } = getCtx();
      const excel = await buildExcel();

      const { status } = await uploadCatalogo(app, jefeVentaToken, almacenId, excel);

      expect(status).toBe(403);
    });

    it('rechaza JEFE_ALMACEN (403)', async () => {
      const { app, jefeAlmacenToken, almacenId } = getCtx();
      const excel = await buildExcel();

      const { status } = await uploadCatalogo(app, jefeAlmacenToken, almacenId, excel);

      expect(status).toBe(403);
    });
  });

  // ── Validaciones ───────────────────────────────────────────────────────────

  describe('Validaciones de archivo', () => {
    it('rechaza si no se envía archivo (400)', async () => {
      const { app, adminToken, almacenId } = getCtx();

      const { status, body } = await request(app.getHttpServer())
        .post(`${API}/carga-masiva/catalogo?almacenId=${almacenId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(status).toBe(400);
      expect(body.message).toMatch(/archivo/i);
    });

    it('rechaza archivo no .xlsx (400)', async () => {
      const { app, adminToken, almacenId } = getCtx();

      const { status, body } = await request(app.getHttpServer())
        .post(`${API}/carga-masiva/catalogo?almacenId=${almacenId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('archivo', Buffer.from('fake,csv,data'), 'data.csv');

      expect(status).toBe(400);
      expect(body.message).toMatch(/xlsx/i);
    });
  });

  describe('Validaciones de contenido', () => {
    it('rechaza si falta la hoja Categorias (400)', async () => {
      const { app, adminToken, almacenId } = getCtx();
      const excel = await buildExcel({ skipSheet: 'Categorias' });

      const { status, body } = await uploadCatalogo(app, adminToken, almacenId, excel);

      expect(status).toBe(400);
      expect(body.message).toMatch(/Categorias/i);
    });

    it('rechaza si falta la hoja Productos (400)', async () => {
      const { app, adminToken, almacenId } = getCtx();
      const excel = await buildExcel({ skipSheet: 'Productos' });

      const { status, body } = await uploadCatalogo(app, adminToken, almacenId, excel);

      expect(status).toBe(400);
      expect(body.message).toMatch(/Productos/i);
    });

    it('rechaza si falta la hoja Variantes (400)', async () => {
      const { app, adminToken, almacenId } = getCtx();
      const excel = await buildExcel({ skipSheet: 'Variantes' });

      const { status, body } = await uploadCatalogo(app, adminToken, almacenId, excel);

      expect(status).toBe(400);
      expect(body.message).toMatch(/Variantes/i);
    });

    it('rechaza si un producto referencia categoría inexistente (400)', async () => {
      const { app, adminToken, almacenId } = getCtx();
      const excel = await buildExcel({
        productos: [{ nombre: 'Prod X', categoria: 'Fantasma' }],
      });

      const { status, body } = await uploadCatalogo(app, adminToken, almacenId, excel);

      expect(status).toBe(400);
      expect(body.message).toMatch(/Fantasma/i);
    });

    it('rechaza si una variante referencia producto inexistente (400)', async () => {
      const { app, adminToken, almacenId } = getCtx();
      const excel = await buildExcel({
        variantes: [
          { producto: 'Inexistente', nombre: '500 ML', unidad: 'UN', sku: 'X-500', costoBase: 1, precioVenta: 2, stockMinimo: 1, stockAlmacen: 10, stockTienda: 2 },
        ],
      });

      const { status, body } = await uploadCatalogo(app, adminToken, almacenId, excel);

      expect(status).toBe(400);
      expect(body.message).toMatch(/Inexistente/i);
    });

    it('rechaza si una variante usa unidad que no existe (400)', async () => {
      const { app, adminToken, almacenId } = getCtx();
      const excel = await buildExcel({
        variantes: [
          { producto: 'Agua E2E', nombre: '500 ML', unidad: 'ZZZ', sku: 'X-ZZZ', costoBase: 1, precioVenta: 2, stockMinimo: 1, stockAlmacen: 10, stockTienda: 2 },
        ],
      });

      const { status, body } = await uploadCatalogo(app, adminToken, almacenId, excel);

      expect(status).toBe(400);
      expect(body.message).toMatch(/ZZZ/i);
    });
  });
});
