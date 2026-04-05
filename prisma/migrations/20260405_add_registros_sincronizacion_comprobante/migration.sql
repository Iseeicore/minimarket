-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('TICKET', 'BOLETA', 'FACTURA');

-- CreateEnum
CREATE TYPE "TipoMovRegistro" AS ENUM ('SALIDA', 'ENTRADA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "TipoSincronizacion" AS ENUM ('MANUAL', 'CIERRE_DIA', 'PROGRAMADA');

-- CreateEnum
CREATE TYPE "EstadoSincronizacion" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CON_DIFERENCIAS');

-- CreateEnum
CREATE TYPE "EstadoReconciliacion" AS ENUM ('COINCIDE', 'DIFERENCIA', 'SIN_CONTRAPARTIDA', 'PENDIENTE_REVISION', 'RESUELTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ModuloApp" ADD VALUE 'REGISTRO_ALMACEN';
ALTER TYPE "ModuloApp" ADD VALUE 'REGISTRO_TIENDA';
ALTER TYPE "ModuloApp" ADD VALUE 'SINCRONIZACION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RolUsuario" ADD VALUE 'JEFE_VENTA';
ALTER TYPE "RolUsuario" ADD VALUE 'JEFE_ALMACEN';

-- AlterEnum
ALTER TYPE "TipoMovStock" ADD VALUE 'TRANSFERENCIA_SALIDA';

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "igv" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "nroComprobante" TEXT,
ADD COLUMN     "serie" TEXT,
ADD COLUMN     "tipoComprobante" "TipoComprobante" NOT NULL DEFAULT 'TICKET';

-- CreateTable
CREATE TABLE "registros_almacen" (
    "id" SERIAL NOT NULL,
    "almacenId" INTEGER NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "tipo" "TipoMovRegistro" NOT NULL,
    "notas" TEXT,
    "creadoPor" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_tienda" (
    "id" SERIAL NOT NULL,
    "almacenId" INTEGER NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "tipo" "TipoMovRegistro" NOT NULL,
    "notas" TEXT,
    "creadoPor" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_tienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sincronizaciones" (
    "id" SERIAL NOT NULL,
    "almacenId" INTEGER NOT NULL,
    "tipo" "TipoSincronizacion" NOT NULL,
    "estado" "EstadoSincronizacion" NOT NULL DEFAULT 'PENDIENTE',
    "periodoDesde" TIMESTAMP(3) NOT NULL,
    "periodoHasta" TIMESTAMP(3) NOT NULL,
    "totalCoincidencias" INTEGER NOT NULL DEFAULT 0,
    "totalDiferencias" INTEGER NOT NULL DEFAULT 0,
    "ejecutadoPor" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoEn" TIMESTAMP(3),

    CONSTRAINT "sincronizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliacion_items" (
    "id" SERIAL NOT NULL,
    "sincronizacionId" INTEGER NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "cantidadAlmacen" INTEGER NOT NULL,
    "cantidadTienda" INTEGER NOT NULL,
    "diferencia" INTEGER NOT NULL,
    "estado" "EstadoReconciliacion" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "notas" TEXT,
    "resueltoPor" INTEGER,
    "resueltoEn" TIMESTAMP(3),

    CONSTRAINT "reconciliacion_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ventas_serie_nroComprobante_key" ON "ventas"("serie", "nroComprobante");

-- AddForeignKey
ALTER TABLE "registros_almacen" ADD CONSTRAINT "registros_almacen_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_almacen" ADD CONSTRAINT "registros_almacen_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_almacen" ADD CONSTRAINT "registros_almacen_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_tienda" ADD CONSTRAINT "registros_tienda_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_tienda" ADD CONSTRAINT "registros_tienda_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_tienda" ADD CONSTRAINT "registros_tienda_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sincronizaciones" ADD CONSTRAINT "sincronizaciones_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sincronizaciones" ADD CONSTRAINT "sincronizaciones_ejecutadoPor_fkey" FOREIGN KEY ("ejecutadoPor") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliacion_items" ADD CONSTRAINT "reconciliacion_items_sincronizacionId_fkey" FOREIGN KEY ("sincronizacionId") REFERENCES "sincronizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliacion_items" ADD CONSTRAINT "reconciliacion_items_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliacion_items" ADD CONSTRAINT "reconciliacion_items_resueltoPor_fkey" FOREIGN KEY ("resueltoPor") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

