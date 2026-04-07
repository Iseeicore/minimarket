import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function main() {
  const workbook = new ExcelJS.Workbook();

  // -- Hoja 1: Categorias --
  const catSheet = workbook.addWorksheet('Categorias');
  catSheet.columns = [
    { header: 'nombre', key: 'nombre', width: 25 },
    { header: 'descripcion', key: 'descripcion', width: 40 },
  ];
  const categorias = [
    { nombre: 'Bebidas', descripcion: 'Aguas, gaseosas, cervezas y jugos' },
    { nombre: 'Lacteos', descripcion: 'Leches, yogurts, quesos y mantequillas' },
    { nombre: 'Snacks', descripcion: 'Papas, galletas, chocolates y golosinas' },
    { nombre: 'Limpieza', descripcion: 'Detergentes, jabones, lejías y papel' },
  ];
  categorias.forEach((c) => catSheet.addRow(c));
  styleHeader(catSheet);

  // -- Hoja 2: Productos --
  const prodSheet = workbook.addWorksheet('Productos');
  prodSheet.columns = [
    { header: 'nombre', key: 'nombre', width: 30 },
    { header: 'categoria', key: 'categoria', width: 20 },
  ];
  const productos = [
    { nombre: 'Agua San Luis', categoria: 'Bebidas' },
    { nombre: 'Coca Cola', categoria: 'Bebidas' },
    { nombre: 'Inca Kola', categoria: 'Bebidas' },
    { nombre: 'Gaseosa Fanta', categoria: 'Bebidas' },
    { nombre: 'Cerveza Cristal', categoria: 'Bebidas' },
    { nombre: 'Leche Gloria', categoria: 'Lacteos' },
    { nombre: 'Yogurt Gloria', categoria: 'Lacteos' },
    { nombre: 'Queso Laive', categoria: 'Lacteos' },
    { nombre: 'Mantequilla Gloria', categoria: 'Lacteos' },
    { nombre: 'Papas Lays', categoria: 'Snacks' },
    { nombre: 'Galletas Oreo', categoria: 'Snacks' },
    { nombre: 'Chocolate Sublime', categoria: 'Snacks' },
    { nombre: 'Galleta Casino', categoria: 'Snacks' },
    { nombre: 'Detergente Bolivar', categoria: 'Limpieza' },
    { nombre: 'Jabon Bolivar', categoria: 'Limpieza' },
    { nombre: 'Lejia Clorox', categoria: 'Limpieza' },
    { nombre: 'Papel Higienico Elite', categoria: 'Limpieza' },
    { nombre: 'Lavavajilla Ayudin', categoria: 'Limpieza' },
  ];
  productos.forEach((p) => prodSheet.addRow(p));
  styleHeader(prodSheet);

  // -- Hoja 3: Variantes --
  const varSheet = workbook.addWorksheet('Variantes');
  varSheet.columns = [
    { header: 'producto', key: 'producto', width: 25 },
    { header: 'nombre', key: 'nombre', width: 22 },
    { header: 'unidad', key: 'unidad', width: 10 },
    { header: 'sku', key: 'sku', width: 18 },
    { header: 'costoBase', key: 'costoBase', width: 12 },
    { header: 'precioVenta', key: 'precioVenta', width: 14 },
    { header: 'stockMinimo', key: 'stockMinimo', width: 14 },
    { header: 'stockAlmacen', key: 'stockAlmacen', width: 14 },
    { header: 'stockTienda', key: 'stockTienda', width: 14 },
  ];

  const variantes = [
    // Bebidas
    { producto: 'Agua San Luis', nombre: '620 ML', unidad: 'ML', sku: 'ASL-620ML', costoBase: 0.50, precioVenta: 1.00, stockMinimo: 48, stockAlmacen: 120, stockTienda: 24 },
    { producto: 'Agua San Luis', nombre: '2.5 LT', unidad: 'LT', sku: 'ASL-2.5LT', costoBase: 1.80, precioVenta: 3.00, stockMinimo: 24, stockAlmacen: 60, stockTienda: 12 },
    { producto: 'Agua San Luis', nombre: 'Pack x6 2.5LT', unidad: 'PQ', sku: 'ASL-PACK6', costoBase: 9.00, precioVenta: 15.00, stockMinimo: 5, stockAlmacen: 15, stockTienda: 3 },
    { producto: 'Coca Cola', nombre: '500 ML', unidad: 'ML', sku: 'COCA-500ML', costoBase: 1.20, precioVenta: 2.50, stockMinimo: 36, stockAlmacen: 100, stockTienda: 20 },
    { producto: 'Coca Cola', nombre: '1.5 LT', unidad: 'LT', sku: 'COCA-1.5LT', costoBase: 3.50, precioVenta: 6.00, stockMinimo: 12, stockAlmacen: 48, stockTienda: 8 },
    { producto: 'Coca Cola', nombre: '3 LT', unidad: 'LT', sku: 'COCA-3LT', costoBase: 5.00, precioVenta: 9.00, stockMinimo: 6, stockAlmacen: 20, stockTienda: 4 },
    { producto: 'Inca Kola', nombre: '500 ML', unidad: 'ML', sku: 'IK-500ML', costoBase: 1.20, precioVenta: 2.50, stockMinimo: 36, stockAlmacen: 90, stockTienda: 18 },
    { producto: 'Inca Kola', nombre: '1.5 LT', unidad: 'LT', sku: 'IK-1.5LT', costoBase: 3.50, precioVenta: 6.00, stockMinimo: 12, stockAlmacen: 40, stockTienda: 6 },
    { producto: 'Gaseosa Fanta', nombre: '500 ML Naranja', unidad: 'ML', sku: 'FANTA-500ML', costoBase: 1.10, precioVenta: 2.50, stockMinimo: 24, stockAlmacen: 60, stockTienda: 10 },
    { producto: 'Gaseosa Fanta', nombre: '1.5 LT Naranja', unidad: 'LT', sku: 'FANTA-1.5LT', costoBase: 3.00, precioVenta: 5.50, stockMinimo: 12, stockAlmacen: 30, stockTienda: 5 },
    { producto: 'Cerveza Cristal', nombre: '650 ML', unidad: 'ML', sku: 'CRIST-650ML', costoBase: 3.50, precioVenta: 6.00, stockMinimo: 24, stockAlmacen: 80, stockTienda: 12 },
    { producto: 'Cerveza Cristal', nombre: 'Pack x6 650ML', unidad: 'PQ', sku: 'CRIST-PK6', costoBase: 18.00, precioVenta: 30.00, stockMinimo: 4, stockAlmacen: 12, stockTienda: 2 },
    // Lacteos
    { producto: 'Leche Gloria', nombre: '400 ML Tarro', unidad: 'ML', sku: 'GLOR-400ML', costoBase: 3.50, precioVenta: 5.50, stockMinimo: 48, stockAlmacen: 150, stockTienda: 30 },
    { producto: 'Leche Gloria', nombre: '1 LT Caja', unidad: 'LT', sku: 'GLOR-1LT', costoBase: 4.00, precioVenta: 6.50, stockMinimo: 24, stockAlmacen: 80, stockTienda: 15 },
    { producto: 'Leche Gloria', nombre: 'Pack x6 Tarro', unidad: 'PQ', sku: 'GLOR-PK6', costoBase: 18.00, precioVenta: 28.00, stockMinimo: 5, stockAlmacen: 20, stockTienda: 4 },
    { producto: 'Yogurt Gloria', nombre: '1 KG Fresa', unidad: 'KG', sku: 'YOGG-1KG-F', costoBase: 5.50, precioVenta: 9.00, stockMinimo: 12, stockAlmacen: 40, stockTienda: 8 },
    { producto: 'Yogurt Gloria', nombre: '1 KG Durazno', unidad: 'KG', sku: 'YOGG-1KG-D', costoBase: 5.50, precioVenta: 9.00, stockMinimo: 12, stockAlmacen: 35, stockTienda: 6 },
    { producto: 'Yogurt Gloria', nombre: '1 KG Vainilla', unidad: 'KG', sku: 'YOGG-1KG-V', costoBase: 5.50, precioVenta: 9.00, stockMinimo: 12, stockAlmacen: 30, stockTienda: 5 },
    { producto: 'Queso Laive', nombre: 'Edam 200g', unidad: 'UN', sku: 'QLAV-EDAM', costoBase: 5.00, precioVenta: 8.50, stockMinimo: 10, stockAlmacen: 25, stockTienda: 5 },
    { producto: 'Queso Laive', nombre: 'Mozzarella 250g', unidad: 'UN', sku: 'QLAV-MOZZ', costoBase: 6.00, precioVenta: 10.00, stockMinimo: 8, stockAlmacen: 20, stockTienda: 4 },
    { producto: 'Mantequilla Gloria', nombre: '200g Barra', unidad: 'UN', sku: 'MANT-200G', costoBase: 3.50, precioVenta: 5.50, stockMinimo: 15, stockAlmacen: 40, stockTienda: 8 },
    // Snacks
    { producto: 'Papas Lays', nombre: 'Clasica 42g', unidad: 'UN', sku: 'LAYS-42G-N', costoBase: 1.00, precioVenta: 2.00, stockMinimo: 48, stockAlmacen: 150, stockTienda: 30 },
    { producto: 'Papas Lays', nombre: 'Ondas 150g', unidad: 'PQ', sku: 'LAYS-150G', costoBase: 4.00, precioVenta: 7.00, stockMinimo: 12, stockAlmacen: 40, stockTienda: 8 },
    { producto: 'Papas Lays', nombre: 'Pack Familiar', unidad: 'PQ', sku: 'LAYS-FAM', costoBase: 8.00, precioVenta: 13.00, stockMinimo: 6, stockAlmacen: 15, stockTienda: 3 },
    { producto: 'Galletas Oreo', nombre: 'Original x6', unidad: 'UN', sku: 'OREO-6UN-N', costoBase: 1.00, precioVenta: 1.80, stockMinimo: 36, stockAlmacen: 100, stockTienda: 20 },
    { producto: 'Galletas Oreo', nombre: 'Paquete x12', unidad: 'PQ', sku: 'OREO-12UN-N', costoBase: 9.00, precioVenta: 15.00, stockMinimo: 6, stockAlmacen: 20, stockTienda: 4 },
    { producto: 'Chocolate Sublime', nombre: 'Barra 30g', unidad: 'UN', sku: 'SUBL-30G', costoBase: 1.00, precioVenta: 2.00, stockMinimo: 48, stockAlmacen: 200, stockTienda: 40 },
    { producto: 'Chocolate Sublime', nombre: 'Caja x24', unidad: 'PQ', sku: 'SUBL-CJ24', costoBase: 20.00, precioVenta: 35.00, stockMinimo: 3, stockAlmacen: 10, stockTienda: 2 },
    { producto: 'Galleta Casino', nombre: 'Chocolate 6 Pack', unidad: 'PQ', sku: 'CAS-CHOC6', costoBase: 1.50, precioVenta: 2.50, stockMinimo: 24, stockAlmacen: 80, stockTienda: 15 },
    { producto: 'Galleta Casino', nombre: 'Fresa 6 Pack', unidad: 'PQ', sku: 'CAS-FRES6', costoBase: 1.50, precioVenta: 2.50, stockMinimo: 24, stockAlmacen: 70, stockTienda: 12 },
    // Limpieza
    { producto: 'Detergente Bolivar', nombre: '500g Bolsa', unidad: 'KG', sku: 'BOL-500G', costoBase: 4.00, precioVenta: 6.50, stockMinimo: 12, stockAlmacen: 40, stockTienda: 8 },
    { producto: 'Detergente Bolivar', nombre: '2.6 KG Bolsa', unidad: 'KG', sku: 'BOL-2.6KG', costoBase: 16.00, precioVenta: 25.00, stockMinimo: 4, stockAlmacen: 12, stockTienda: 2 },
    { producto: 'Jabon Bolivar', nombre: 'Barra 230g', unidad: 'UN', sku: 'JBOL-230G', costoBase: 2.00, precioVenta: 3.50, stockMinimo: 24, stockAlmacen: 60, stockTienda: 10 },
    { producto: 'Jabon Bolivar', nombre: 'Pack x3 Barras', unidad: 'PQ', sku: 'JBOL-PK3', costoBase: 5.50, precioVenta: 9.00, stockMinimo: 8, stockAlmacen: 20, stockTienda: 4 },
    { producto: 'Lejia Clorox', nombre: '1 LT', unidad: 'LT', sku: 'CLRX-1LT', costoBase: 3.00, precioVenta: 5.00, stockMinimo: 12, stockAlmacen: 35, stockTienda: 6 },
    { producto: 'Lejia Clorox', nombre: '4 LT Galon', unidad: 'LT', sku: 'CLRX-4LT', costoBase: 9.00, precioVenta: 15.00, stockMinimo: 4, stockAlmacen: 10, stockTienda: 2 },
    { producto: 'Papel Higienico Elite', nombre: 'Pack x4 Rollos', unidad: 'PQ', sku: 'ELITE-PK4', costoBase: 5.00, precioVenta: 8.50, stockMinimo: 12, stockAlmacen: 40, stockTienda: 8 },
    { producto: 'Papel Higienico Elite', nombre: 'Pack x12 Rollos', unidad: 'PQ', sku: 'ELITE-PK12', costoBase: 13.00, precioVenta: 22.00, stockMinimo: 4, stockAlmacen: 15, stockTienda: 3 },
    { producto: 'Lavavajilla Ayudin', nombre: '500g Limon', unidad: 'KG', sku: 'AYUD-500G', costoBase: 3.00, precioVenta: 5.00, stockMinimo: 12, stockAlmacen: 30, stockTienda: 5 },
  ];
  variantes.forEach((v) => varSheet.addRow(v));
  styleHeader(varSheet);

  const outPath = path.join(__dirname, 'catalogo-ejemplo.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`Template generado: ${outPath}`);
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  };
}

main().catch(console.error);
