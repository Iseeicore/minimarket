import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

interface CategoriaRow {
  nombre: string;
  descripcion?: string;
}

interface ProductoRow {
  nombre: string;
  categoria: string;
}

interface VarianteRow {
  producto: string;
  nombre: string;
  unidad: string;
  sku?: string;
  costoBase: number;
  precioVenta: number;
  stockMinimo: number;
  stockAlmacen: number;
  stockTienda: number;
}

export interface CargaMasivaResult {
  categorias: number;
  productos: number;
  variantes: number;
  stockAlmacen: number;
  stockTienda: number;
}

@Injectable()
export class CargaMasivaService {
  constructor(private prisma: PrismaService) {}

  async cargarCatalogo(
    buffer: Buffer,
    empresaId: number,
    almacenId: number,
  ): Promise<CargaMasivaResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const categorias = this.parseCategorias(workbook);
    const productos = this.parseProductos(workbook);
    const variantes = this.parseVariantes(workbook);

    if (categorias.length === 0)
      throw new BadRequestException('La hoja "Categorias" está vacía o no existe');
    if (productos.length === 0)
      throw new BadRequestException('La hoja "Productos" está vacía o no existe');
    if (variantes.length === 0)
      throw new BadRequestException('La hoja "Variantes" está vacía o no existe');

    // Resolver unidades existentes
    const unidades = await this.prisma.unidadMedida.findMany();
    const unidadMap = new Map(unidades.map((u) => [u.abreviatura.toUpperCase(), u.id]));

    // Validar que todas las abreviaturas de unidad existen
    for (let i = 0; i < variantes.length; i++) {
      const v = variantes[i];
      if (!unidadMap.has(v.unidad.toUpperCase())) {
        throw new BadRequestException(
          `Fila ${i + 2} en Variantes: unidad "${v.unidad}" no existe. Disponibles: ${[...unidadMap.keys()].join(', ')}`,
        );
      }
    }

    // Validar que cada producto referencia una categoría que está en la hoja
    const categoriasSet = new Set(categorias.map((c) => c.nombre.trim().toLowerCase()));
    for (let i = 0; i < productos.length; i++) {
      if (!categoriasSet.has(productos[i].categoria.trim().toLowerCase())) {
        throw new BadRequestException(
          `Fila ${i + 2} en Productos: categoría "${productos[i].categoria}" no existe en la hoja Categorías`,
        );
      }
    }

    // Validar que cada variante referencia un producto que está en la hoja
    const productosSet = new Set(productos.map((p) => p.nombre.trim().toLowerCase()));
    for (let i = 0; i < variantes.length; i++) {
      if (!productosSet.has(variantes[i].producto.trim().toLowerCase())) {
        throw new BadRequestException(
          `Fila ${i + 2} en Variantes: producto "${variantes[i].producto}" no existe en la hoja Productos`,
        );
      }
    }

    // Transacción atómica
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear categorías
      const categoriaMap = new Map<string, number>();
      for (const cat of categorias) {
        const created = await tx.categoria.create({
          data: {
            empresaId,
            nombre: cat.nombre.trim(),
            descripcion: cat.descripcion?.trim() || null,
          },
        });
        categoriaMap.set(cat.nombre.trim().toLowerCase(), created.id);
      }

      // 2. Crear productos
      const productoMap = new Map<string, number>();
      for (const prod of productos) {
        const categoriaId = categoriaMap.get(prod.categoria.trim().toLowerCase());
        const created = await tx.producto.create({
          data: {
            empresaId,
            categoriaId: categoriaId!,
            nombre: prod.nombre.trim(),
          },
        });
        productoMap.set(prod.nombre.trim().toLowerCase(), created.id);
      }

      // 3. Crear variantes + stock
      let variantesCount = 0;
      let stockAlmCount = 0;
      let stockTieCount = 0;

      for (const v of variantes) {
        const productoId = productoMap.get(v.producto.trim().toLowerCase());
        const unidadId = unidadMap.get(v.unidad.toUpperCase());

        const variante = await tx.variante.create({
          data: {
            productoId: productoId!,
            unidadId: unidadId!,
            nombre: v.nombre.trim(),
            sku: v.sku?.trim() || null,
            costoBase: v.costoBase,
            precioVenta: v.precioVenta,
            stockMinimo: v.stockMinimo,
          },
        });
        variantesCount++;

        await tx.stockAlmacen.create({
          data: { almacenId, varianteId: variante.id, cantidad: v.stockAlmacen },
        });
        stockAlmCount++;

        await tx.stockTienda.create({
          data: { almacenId, varianteId: variante.id, cantidad: v.stockTienda },
        });
        stockTieCount++;
      }

      return {
        categorias: categorias.length,
        productos: productos.length,
        variantes: variantesCount,
        stockAlmacen: stockAlmCount,
        stockTienda: stockTieCount,
      };
    });
  }

  // -- Parsers ----------------------------------------------------------------

  private parseCategorias(workbook: ExcelJS.Workbook): CategoriaRow[] {
    const sheet = workbook.getWorksheet('Categorias');
    if (!sheet) return [];

    const rows: CategoriaRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const nombre = this.cellToString(row.getCell(1));
      if (!nombre) return;
      rows.push({
        nombre,
        descripcion: this.cellToString(row.getCell(2)),
      });
    });
    return rows;
  }

  private parseProductos(workbook: ExcelJS.Workbook): ProductoRow[] {
    const sheet = workbook.getWorksheet('Productos');
    if (!sheet) return [];

    const rows: ProductoRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const nombre = this.cellToString(row.getCell(1));
      const categoria = this.cellToString(row.getCell(2));
      if (!nombre || !categoria) return;
      rows.push({ nombre, categoria });
    });
    return rows;
  }

  private parseVariantes(workbook: ExcelJS.Workbook): VarianteRow[] {
    const sheet = workbook.getWorksheet('Variantes');
    if (!sheet) return [];

    const rows: VarianteRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const producto = this.cellToString(row.getCell(1));
      const nombre = this.cellToString(row.getCell(2));
      const unidad = this.cellToString(row.getCell(3));
      if (!producto || !nombre || !unidad) return;

      rows.push({
        producto,
        nombre,
        unidad,
        sku: this.cellToString(row.getCell(4)),
        costoBase: this.cellToNumber(row.getCell(5)),
        precioVenta: this.cellToNumber(row.getCell(6)),
        stockMinimo: this.cellToNumber(row.getCell(7)),
        stockAlmacen: this.cellToNumber(row.getCell(8)),
        stockTienda: this.cellToNumber(row.getCell(9)),
      });
    });
    return rows;
  }

  private cellToString(cell: ExcelJS.Cell): string {
    const val = cell.value;
    if (val == null) return '';
    if (typeof val === 'object' && 'text' in val) return String(val.text).trim();
    return String(val).trim();
  }

  private cellToNumber(cell: ExcelJS.Cell): number {
    const val = cell.value;
    if (val == null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }
}
