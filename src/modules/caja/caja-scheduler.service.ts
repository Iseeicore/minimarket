import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { EstadoCaja } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const TIMEZONE = 'America/Lima';

@Injectable()
export class CajaSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CajaSchedulerService.name);
  private almacenIds: number[] = [];
  private sistemaUsuarioId: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>('CAJA_AUTO_ALMACENES', '');
    this.almacenIds = raw
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    this.sistemaUsuarioId = parseInt(
      this.config.get<string>('CAJA_USUARIO_SISTEMA_ID', '0'),
      10,
    );

    if (this.almacenIds.length === 0) {
      this.logger.warn('CAJA_AUTO_ALMACENES no configurado — cron de caja desactivado');
    } else {
      this.logger.log(
        `Cron caja activo — almacenes: [${this.almacenIds}], usuario sistema: ${this.sistemaUsuarioId}`,
      );
    }
  }

  // -- Apertura: 7:00 AM Lima + retries 7:20, 7:40 --

  @Cron('0 7 * * *', { name: 'caja-apertura', timeZone: TIMEZONE })
  handleApertura() {
    return this.abrirCajas('7:00');
  }

  @Cron('20 7 * * *', { name: 'caja-apertura-retry-1', timeZone: TIMEZONE })
  handleAperturaRetry1() {
    return this.abrirCajas('7:20 (retry)');
  }

  @Cron('40 7 * * *', { name: 'caja-apertura-retry-2', timeZone: TIMEZONE })
  handleAperturaRetry2() {
    return this.abrirCajas('7:40 (retry)');
  }

  // -- Cierre: 10:00 PM Lima + retries 10:20, 10:40 --

  @Cron('0 22 * * *', { name: 'caja-cierre', timeZone: TIMEZONE })
  handleCierre() {
    return this.cerrarCajas('22:00');
  }

  @Cron('20 22 * * *', { name: 'caja-cierre-retry-1', timeZone: TIMEZONE })
  handleCierreRetry1() {
    return this.cerrarCajas('22:20 (retry)');
  }

  @Cron('40 22 * * *', { name: 'caja-cierre-retry-2', timeZone: TIMEZONE })
  handleCierreRetry2() {
    return this.cerrarCajas('22:40 (retry)');
  }

  // -- Lógica de apertura (idempotente) --

  private async abrirCajas(tag: string) {
    if (!this.almacenIds.length) return;
    this.logger.log(`[${tag}] Iniciando apertura automática...`);

    for (const almacenId of this.almacenIds) {
      try {
        await this.abrirCaja(almacenId);
      } catch (error) {
        this.logger.error(
          `[${tag}] Error abriendo caja almacen=${almacenId}: ${error.message}`,
        );
      }
    }
  }

  private async abrirCaja(almacenId: number) {
    // 1. ¿Hay alguna caja ABIERTA en este almacén?
    const cajaAbierta = await this.prisma.caja.findFirst({
      where: { almacenId, estado: EstadoCaja.ABIERTA },
    });

    if (cajaAbierta) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const abiertoFecha = new Date(cajaAbierta.abiertoEn);

      if (abiertoFecha >= hoy) {
        // Abierta HOY → skip (idempotente)
        this.logger.log(`Almacen ${almacenId}: caja ya abierta hoy (#${cajaAbierta.id}) — skip`);
        return;
      }

      // Abierta de un día ANTERIOR → cerrarla forzosamente
      this.logger.warn(
        `Almacen ${almacenId}: cerrando caja huérfana #${cajaAbierta.id} (abierta ${abiertoFecha.toISOString()}) con montoCierre=0`,
      );
      await this.prisma.caja.update({
        where: { id: cajaAbierta.id },
        data: { estado: EstadoCaja.CERRADA, montoCierre: 0, cerradoEn: new Date() },
      });
    }

    // 2. Crear caja nueva con montoApertura = 0
    const nueva = await this.prisma.caja.create({
      data: {
        almacenId,
        abiertoPor: this.sistemaUsuarioId,
        montoApertura: 0,
        estado: EstadoCaja.ABIERTA,
      },
    });

    this.logger.log(`Almacen ${almacenId}: caja #${nueva.id} abierta automáticamente`);
  }

  // -- Lógica de cierre (idempotente) --

  private async cerrarCajas(tag: string) {
    if (!this.almacenIds.length) return;
    this.logger.log(`[${tag}] Iniciando cierre automático...`);

    for (const almacenId of this.almacenIds) {
      try {
        await this.cerrarCaja(almacenId);
      } catch (error) {
        this.logger.error(
          `[${tag}] Error cerrando caja almacen=${almacenId}: ${error.message}`,
        );
      }
    }
  }

  private async cerrarCaja(almacenId: number) {
    const caja = await this.prisma.caja.findFirst({
      where: { almacenId, estado: EstadoCaja.ABIERTA },
    });

    if (!caja) {
      this.logger.log(`Almacen ${almacenId}: no hay caja abierta — skip`);
      return;
    }

    // Calcular resumen del día (misma lógica que cerrar() manual)
    const inicio = new Date(caja.abiertoEn);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);
    const fechaDia = new Date(inicio);

    await this.prisma.$transaction(async (tx) => {
      await tx.caja.update({
        where: { id: caja.id },
        data: { estado: EstadoCaja.CERRADA, montoCierre: 0, cerradoEn: new Date() },
      });

      const ventas = await tx.venta.findMany({
        where: {
          almacenId: caja.almacenId,
          creadoEn: { gte: inicio, lte: fin },
          estado: 'COMPLETADA',
        },
        select: { total: true, metodoPago: true },
      });

      let montoTotal = 0,
        montoPorEfectivo = 0,
        montoPorYape = 0,
        montoTransferencia = 0,
        montoOtro = 0;

      for (const v of ventas) {
        const monto = Number(v.total);
        montoTotal += monto;
        if (v.metodoPago === 'EFECTIVO') montoPorEfectivo += monto;
        else if (v.metodoPago === 'YAPE') montoPorYape += monto;
        else if (v.metodoPago === 'TRANSFERENCIA') montoTransferencia += monto;
        else montoOtro += monto;
      }

      const devoluciones = await tx.devolucion.findMany({
        where: {
          venta: { almacenId: caja.almacenId },
          creadoEn: { gte: inicio, lte: fin },
        },
        include: { items: { select: { montoDevuelto: true } } },
      });
      const totalDevoluciones = devoluciones.reduce(
        (acc, d) => acc + d.items.reduce((s, i) => s + Number(i.montoDevuelto), 0),
        0,
      );

      await tx.resumenDia.upsert({
        where: {
          fecha_almacenId: { fecha: fechaDia, almacenId: caja.almacenId },
        },
        create: {
          fecha: fechaDia,
          almacenId: caja.almacenId,
          totalVentas: ventas.length,
          montoTotal,
          montoPorEfectivo,
          montoPorYape,
          montoTransferencia,
          montoOtro,
          totalDevoluciones,
        },
        update: {
          totalVentas: ventas.length,
          montoTotal,
          montoPorEfectivo,
          montoPorYape,
          montoTransferencia,
          montoOtro,
          totalDevoluciones,
        },
      });
    });

    this.logger.log(`Almacen ${almacenId}: caja #${caja.id} cerrada automáticamente`);
  }
}
