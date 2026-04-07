-- CreateEnum
CREATE TYPE "TipoOrden" AS ENUM ('VENTA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('PENDIENTE', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrigenStock" AS ENUM ('ALMACEN', 'TIENDA');

-- AlterEnum
ALTER TYPE "ModuloApp" ADD VALUE 'ORDENES_SALIDA';

-- AlterEnum
ALTER TYPE "TipoMovStock" ADD VALUE 'ORDEN_SALIDA';

-- CreateTable
CREATE TABLE "ordenes_salida" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "almacenId" INTEGER NOT NULL,
    "tipo" "TipoOrden" NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'PENDIENTE',
    "totalProductos" INTEGER NOT NULL DEFAULT 0,
    "totalUnidades" INTEGER NOT NULL DEFAULT 0,
    "solicitadoPor" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoEn" TIMESTAMP(3),

    CONSTRAINT "ordenes_salida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_salida_detalle" (
    "id" SERIAL NOT NULL,
    "ordenSalidaId" INTEGER NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "origen" "OrigenStock" NOT NULL DEFAULT 'ALMACEN',

    CONSTRAINT "ordenes_salida_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_tienda" (
    "id" SERIAL NOT NULL,
    "almacenId" INTEGER NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_tienda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_tienda_almacenId_varianteId_key" ON "stock_tienda"("almacenId", "varianteId");

-- AddForeignKey
ALTER TABLE "ordenes_salida" ADD CONSTRAINT "ordenes_salida_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_salida" ADD CONSTRAINT "ordenes_salida_solicitadoPor_fkey" FOREIGN KEY ("solicitadoPor") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_salida_detalle" ADD CONSTRAINT "ordenes_salida_detalle_ordenSalidaId_fkey" FOREIGN KEY ("ordenSalidaId") REFERENCES "ordenes_salida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_salida_detalle" ADD CONSTRAINT "ordenes_salida_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_tienda" ADD CONSTRAINT "stock_tienda_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_tienda" ADD CONSTRAINT "stock_tienda_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
