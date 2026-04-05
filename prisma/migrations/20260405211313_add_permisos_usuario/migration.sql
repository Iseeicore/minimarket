-- CreateEnum
CREATE TYPE "ModuloApp" AS ENUM ('VENTAS', 'COMPRAS', 'CAJA', 'DEVOLUCIONES', 'STOCK', 'PRODUCTOS', 'VARIANTES', 'CONTACTOS', 'BITACORA', 'DASHBOARD');

-- CreateTable
CREATE TABLE "permisos_usuario" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "modulo" "ModuloApp" NOT NULL,
    "leer" BOOLEAN NOT NULL DEFAULT false,
    "crear" BOOLEAN NOT NULL DEFAULT false,
    "editar" BOOLEAN NOT NULL DEFAULT false,
    "eliminar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permisos_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permisos_usuario_usuarioId_modulo_key" ON "permisos_usuario"("usuarioId", "modulo");

-- AddForeignKey
ALTER TABLE "permisos_usuario" ADD CONSTRAINT "permisos_usuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
