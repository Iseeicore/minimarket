-- CreateTable
CREATE TABLE "resumenes_dia" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "almacenId" INTEGER NOT NULL,
    "totalVentas" INTEGER NOT NULL DEFAULT 0,
    "montoTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoPorEfectivo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoPorYape" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoTransferencia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "montoOtro" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDevoluciones" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumenes_dia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resumenes_dia_fecha_almacenId_key" ON "resumenes_dia"("fecha", "almacenId");

-- AddForeignKey
ALTER TABLE "resumenes_dia" ADD CONSTRAINT "resumenes_dia_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
