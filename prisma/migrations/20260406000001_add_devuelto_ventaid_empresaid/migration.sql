-- ────────────────────────────────────────────────────────────────────────────
-- Migration: add_devuelto_ventaid_empresaid
-- Agrega:
--   · registros_almacen.devuelto  (Boolean DEFAULT false)
--   · registros_almacen.ventaId   (Int? FK → ventas)
--   · registros_tienda.devuelto   (Boolean DEFAULT false)
--   · categorias.empresaId        (Int NOT NULL FK → empresas)
--   · productos.empresaId         (Int NOT NULL FK → empresas)
-- ────────────────────────────────────────────────────────────────────────────

-- ── registros_almacen ─────────────────────────────────────────────────────────
ALTER TABLE "registros_almacen"
  ADD COLUMN "devuelto" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "registros_almacen"
  ADD COLUMN "ventaId" INTEGER;

ALTER TABLE "registros_almacen"
  ADD CONSTRAINT "registros_almacen_ventaId_fkey"
  FOREIGN KEY ("ventaId") REFERENCES "ventas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── registros_tienda ──────────────────────────────────────────────────────────
ALTER TABLE "registros_tienda"
  ADD COLUMN "devuelto" BOOLEAN NOT NULL DEFAULT false;

-- ── categorias.empresaId ──────────────────────────────────────────────────────
-- Paso 1: agregar nullable
ALTER TABLE "categorias" ADD COLUMN "empresaId" INTEGER;

-- Paso 2: asignar la primera empresa a las filas existentes
UPDATE "categorias"
SET "empresaId" = (SELECT "id" FROM "empresas" ORDER BY "id" LIMIT 1)
WHERE "empresaId" IS NULL;

-- Paso 3: convertir a NOT NULL + FK
ALTER TABLE "categorias" ALTER COLUMN "empresaId" SET NOT NULL;

ALTER TABLE "categorias"
  ADD CONSTRAINT "categorias_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── productos.empresaId ───────────────────────────────────────────────────────
-- Paso 1: agregar nullable
ALTER TABLE "productos" ADD COLUMN "empresaId" INTEGER;

-- Paso 2: asignar la primera empresa a las filas existentes
UPDATE "productos"
SET "empresaId" = (SELECT "id" FROM "empresas" ORDER BY "id" LIMIT 1)
WHERE "empresaId" IS NULL;

-- Paso 3: convertir a NOT NULL + FK
ALTER TABLE "productos" ALTER COLUMN "empresaId" SET NOT NULL;

ALTER TABLE "productos"
  ADD CONSTRAINT "productos_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "empresas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
