-- Add DEVOLUCION value to TipoMovRegistro enum
ALTER TYPE "TipoMovRegistro" ADD VALUE IF NOT EXISTS 'DEVOLUCION';
