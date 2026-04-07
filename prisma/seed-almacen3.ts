import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Configuracion ────────────────────────────────────────────────────────────
const EMPRESA_ID  = 7;
const ALMACEN_ID  = 3;

// Categorias de empresaId 7: Bebidas=13, Lacteos=14, Snacks=15, Limpieza=16
// Unidades: LT=16, ML=17, KG=18, UN=19, PQ=20

async function main() {
  console.log('Insertando productos, variantes y stock para almacen 3...\n');

  // ── Productos + Variantes ──────────────────────────────────────────────────
  const productosData = [
    // ── BEBIDAS (categoriaId: 13) ──
    {
      nombre: 'Agua San Luis',
      categoriaId: 13,
      variantes: [
        { nombre: '620 ML',          sku: 'ASL-620ML',    unidadId: 17, costo: 0.50, precio: 1.00, minimo: 48, stockAlm: 120, stockTie: 24 },
        { nombre: '2.5 LT',          sku: 'ASL-2.5LT',   unidadId: 16, costo: 1.80, precio: 3.00, minimo: 24, stockAlm: 60,  stockTie: 12 },
        { nombre: 'Pack x6 2.5LT',   sku: 'ASL-PACK6',   unidadId: 20, costo: 9.00, precio: 15.00, minimo: 5, stockAlm: 15,  stockTie: 3 },
      ],
    },
    {
      nombre: 'Coca Cola',
      categoriaId: 13,
      variantes: [
        { nombre: '500 ML',          sku: 'COCA-500ML',   unidadId: 17, costo: 1.20, precio: 2.50, minimo: 36, stockAlm: 100, stockTie: 20 },
        { nombre: '1.5 LT',          sku: 'COCA-1.5LT',  unidadId: 16, costo: 3.50, precio: 6.00, minimo: 12, stockAlm: 48,  stockTie: 8 },
        { nombre: '3 LT',            sku: 'COCA-3LT',     unidadId: 16, costo: 5.00, precio: 9.00, minimo: 6,  stockAlm: 20,  stockTie: 4 },
      ],
    },
    {
      nombre: 'Inca Kola',
      categoriaId: 13,
      variantes: [
        { nombre: '500 ML',          sku: 'IK-500ML',    unidadId: 17, costo: 1.20, precio: 2.50, minimo: 36, stockAlm: 90,  stockTie: 18 },
        { nombre: '1.5 LT',          sku: 'IK-1.5LT',   unidadId: 16, costo: 3.50, precio: 6.00, minimo: 12, stockAlm: 40,  stockTie: 6 },
      ],
    },
    {
      nombre: 'Gaseosa Fanta',
      categoriaId: 13,
      variantes: [
        { nombre: '500 ML Naranja',  sku: 'FANTA-500ML', unidadId: 17, costo: 1.10, precio: 2.50, minimo: 24, stockAlm: 60,  stockTie: 10 },
        { nombre: '1.5 LT Naranja',  sku: 'FANTA-1.5LT', unidadId: 16, costo: 3.00, precio: 5.50, minimo: 12, stockAlm: 30, stockTie: 5 },
      ],
    },
    {
      nombre: 'Cerveza Cristal',
      categoriaId: 13,
      variantes: [
        { nombre: '650 ML',          sku: 'CRIST-650ML', unidadId: 17, costo: 3.50, precio: 6.00, minimo: 24, stockAlm: 80,  stockTie: 12 },
        { nombre: 'Pack x6 650ML',   sku: 'CRIST-PK6',   unidadId: 20, costo: 18.00, precio: 30.00, minimo: 4, stockAlm: 12, stockTie: 2 },
      ],
    },

    // ── LACTEOS (categoriaId: 14) ──
    {
      nombre: 'Leche Gloria',
      categoriaId: 14,
      variantes: [
        { nombre: '400 ML Tarro',    sku: 'GLOR-400ML',  unidadId: 17, costo: 3.50, precio: 5.50, minimo: 48, stockAlm: 150, stockTie: 30 },
        { nombre: '1 LT Caja',       sku: 'GLOR-1LT',    unidadId: 16, costo: 4.00, precio: 6.50, minimo: 24, stockAlm: 80,  stockTie: 15 },
        { nombre: 'Pack x6 Tarro',   sku: 'GLOR-PK6',    unidadId: 20, costo: 18.00, precio: 28.00, minimo: 5, stockAlm: 20, stockTie: 4 },
      ],
    },
    {
      nombre: 'Yogurt Gloria',
      categoriaId: 14,
      variantes: [
        { nombre: '1 KG Fresa',      sku: 'YOGG-1KG-F',  unidadId: 18, costo: 5.50, precio: 9.00, minimo: 12, stockAlm: 40,  stockTie: 8 },
        { nombre: '1 KG Durazno',    sku: 'YOGG-1KG-D',  unidadId: 18, costo: 5.50, precio: 9.00, minimo: 12, stockAlm: 35,  stockTie: 6 },
        { nombre: '1 KG Vainilla',   sku: 'YOGG-1KG-V',  unidadId: 18, costo: 5.50, precio: 9.00, minimo: 12, stockAlm: 30,  stockTie: 5 },
      ],
    },
    {
      nombre: 'Queso Laive',
      categoriaId: 14,
      variantes: [
        { nombre: 'Edam 200g',       sku: 'QLAV-EDAM',   unidadId: 19, costo: 5.00, precio: 8.50, minimo: 10, stockAlm: 25,  stockTie: 5 },
        { nombre: 'Mozzarella 250g', sku: 'QLAV-MOZZ',   unidadId: 19, costo: 6.00, precio: 10.00, minimo: 8, stockAlm: 20,  stockTie: 4 },
      ],
    },
    {
      nombre: 'Mantequilla Gloria',
      categoriaId: 14,
      variantes: [
        { nombre: '200g Barra',      sku: 'MANT-200G',   unidadId: 19, costo: 3.50, precio: 5.50, minimo: 15, stockAlm: 40,  stockTie: 8 },
      ],
    },

    // ── SNACKS (categoriaId: 15) ──
    {
      nombre: 'Papas Lays',
      categoriaId: 15,
      variantes: [
        { nombre: 'Clasica 42g',     sku: 'LAYS-42G-N',  unidadId: 19, costo: 1.00, precio: 2.00, minimo: 48, stockAlm: 150, stockTie: 30 },
        { nombre: 'Ondas 150g',      sku: 'LAYS-150G',   unidadId: 20, costo: 4.00, precio: 7.00, minimo: 12, stockAlm: 40,  stockTie: 8 },
        { nombre: 'Pack Familiar',   sku: 'LAYS-FAM',    unidadId: 20, costo: 8.00, precio: 13.00, minimo: 6, stockAlm: 15,  stockTie: 3 },
      ],
    },
    {
      nombre: 'Galletas Oreo',
      categoriaId: 15,
      variantes: [
        { nombre: 'Original x6',     sku: 'OREO-6UN-N',  unidadId: 19, costo: 1.00, precio: 1.80, minimo: 36, stockAlm: 100, stockTie: 20 },
        { nombre: 'Paquete x12',     sku: 'OREO-12UN-N', unidadId: 20, costo: 9.00, precio: 15.00, minimo: 6, stockAlm: 20,  stockTie: 4 },
      ],
    },
    {
      nombre: 'Chocolate Sublime',
      categoriaId: 15,
      variantes: [
        { nombre: 'Barra 30g',       sku: 'SUBL-30G',    unidadId: 19, costo: 1.00, precio: 2.00, minimo: 48, stockAlm: 200, stockTie: 40 },
        { nombre: 'Caja x24',        sku: 'SUBL-CJ24',   unidadId: 20, costo: 20.00, precio: 35.00, minimo: 3, stockAlm: 10, stockTie: 2 },
      ],
    },
    {
      nombre: 'Galleta Casino',
      categoriaId: 15,
      variantes: [
        { nombre: 'Chocolate 6 Pack', sku: 'CAS-CHOC6',  unidadId: 20, costo: 1.50, precio: 2.50, minimo: 24, stockAlm: 80,  stockTie: 15 },
        { nombre: 'Fresa 6 Pack',     sku: 'CAS-FRES6',  unidadId: 20, costo: 1.50, precio: 2.50, minimo: 24, stockAlm: 70,  stockTie: 12 },
      ],
    },

    // ── LIMPIEZA (categoriaId: 16) ──
    {
      nombre: 'Detergente Bolivar',
      categoriaId: 16,
      variantes: [
        { nombre: '500g Bolsa',       sku: 'BOL-500G',    unidadId: 18, costo: 4.00, precio: 6.50, minimo: 12, stockAlm: 40,  stockTie: 8 },
        { nombre: '2.6 KG Bolsa',     sku: 'BOL-2.6KG',   unidadId: 18, costo: 16.00, precio: 25.00, minimo: 4, stockAlm: 12, stockTie: 2 },
      ],
    },
    {
      nombre: 'Jabon Bolivar',
      categoriaId: 16,
      variantes: [
        { nombre: 'Barra 230g',       sku: 'JBOL-230G',   unidadId: 19, costo: 2.00, precio: 3.50, minimo: 24, stockAlm: 60,  stockTie: 10 },
        { nombre: 'Pack x3 Barras',   sku: 'JBOL-PK3',    unidadId: 20, costo: 5.50, precio: 9.00, minimo: 8,  stockAlm: 20,  stockTie: 4 },
      ],
    },
    {
      nombre: 'Lejia Clorox',
      categoriaId: 16,
      variantes: [
        { nombre: '1 LT',             sku: 'CLRX-1LT',    unidadId: 16, costo: 3.00, precio: 5.00, minimo: 12, stockAlm: 35,  stockTie: 6 },
        { nombre: '4 LT Galon',       sku: 'CLRX-4LT',    unidadId: 16, costo: 9.00, precio: 15.00, minimo: 4, stockAlm: 10,  stockTie: 2 },
      ],
    },
    {
      nombre: 'Papel Higienico Elite',
      categoriaId: 16,
      variantes: [
        { nombre: 'Pack x4 Rollos',   sku: 'ELITE-PK4',   unidadId: 20, costo: 5.00, precio: 8.50, minimo: 12, stockAlm: 40,  stockTie: 8 },
        { nombre: 'Pack x12 Rollos',  sku: 'ELITE-PK12',  unidadId: 20, costo: 13.00, precio: 22.00, minimo: 4, stockAlm: 15, stockTie: 3 },
      ],
    },
    {
      nombre: 'Lavavajilla Ayudin',
      categoriaId: 16,
      variantes: [
        { nombre: '500g Limon',        sku: 'AYUD-500G',   unidadId: 18, costo: 3.00, precio: 5.00, minimo: 12, stockAlm: 30,  stockTie: 5 },
      ],
    },
  ];

  let productosCreados = 0;
  let variantesCreadas = 0;
  let stockAlmCreados  = 0;
  let stockTieCreados  = 0;

  for (const prod of productosData) {
    const producto = await prisma.producto.create({
      data: {
        empresaId:   EMPRESA_ID,
        categoriaId: prod.categoriaId,
        nombre:      prod.nombre,
      },
    });
    productosCreados++;

    for (const v of prod.variantes) {
      const variante = await prisma.variante.create({
        data: {
          productoId:  producto.id,
          unidadId:    v.unidadId,
          nombre:      v.nombre,
          sku:         v.sku,
          costoBase:   v.costo,
          precioVenta: v.precio,
          stockMinimo: v.minimo,
        },
      });
      variantesCreadas++;

      // Stock en almacen
      await prisma.stockAlmacen.upsert({
        where: { almacenId_varianteId: { almacenId: ALMACEN_ID, varianteId: variante.id } },
        create: { almacenId: ALMACEN_ID, varianteId: variante.id, cantidad: v.stockAlm },
        update: { cantidad: v.stockAlm },
      });
      stockAlmCreados++;

      // Stock en tienda
      await prisma.stockTienda.upsert({
        where: { almacenId_varianteId: { almacenId: ALMACEN_ID, varianteId: variante.id } },
        create: { almacenId: ALMACEN_ID, varianteId: variante.id, cantidad: v.stockTie },
        update: { cantidad: v.stockTie },
      });
      stockTieCreados++;
    }
  }

  console.log(`Productos creados:        ${productosCreados}`);
  console.log(`Variantes creadas:        ${variantesCreadas}`);
  console.log(`Stock almacen insertados: ${stockAlmCreados}`);
  console.log(`Stock tienda insertados:  ${stockTieCreados}`);
  console.log('\nSeed completado para almacen 3.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
