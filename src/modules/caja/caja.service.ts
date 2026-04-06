import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCaja, EstadoVenta, MetodoPago } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CreateMovimientoCajaDto } from './dto/create-movimiento-caja.dto';

const INCLUDE_CAJA = {
  almacen: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true } },
};

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  findAll(empresaId: number) {
    return this.prisma.caja.findMany({
      where:   { almacen: { empresaId } },
      include: INCLUDE_CAJA,
      orderBy: { abiertoEn: 'desc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const caja = await this.prisma.caja.findFirst({
      where:   { id, almacen: { empresaId } },
      include: { ...INCLUDE_CAJA, movimientos: { orderBy: { creadoEn: 'desc' } } },
    });
    if (!caja) throw new NotFoundException(`Caja #${id} no encontrada`);
    return caja;
  }

  async getActiva(almacenId: number, empresaId: number) {
    return this.prisma.caja.findFirst({
      where:   { almacenId, estado: EstadoCaja.ABIERTA, almacen: { empresaId } },
      include: { ...INCLUDE_CAJA, movimientos: { orderBy: { creadoEn: 'desc' } } },
    });
  }

  async abrir(dto: AbrirCajaDto, usuarioId: number, empresaId: number) {
    // Verificar que el almacén pertenece a la empresa
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenId, empresaId },
    });
    if (!almacen) throw new NotFoundException(`Almacen #${dto.almacenId} no encontrado`);

    const cajaAbierta = await this.prisma.caja.findFirst({
      where: { almacenId: dto.almacenId, estado: EstadoCaja.ABIERTA },
    });
    if (cajaAbierta) {
      throw new BadRequestException('Ya existe una caja abierta en este almacén');
    }

    return this.prisma.caja.create({
      data: {
        almacenId:     dto.almacenId,
        abiertoPor:    usuarioId,
        montoApertura: dto.montoApertura,
        estado:        EstadoCaja.ABIERTA,
      },
      include: INCLUDE_CAJA,
    });
  }

  async cerrar(id: number, dto: CerrarCajaDto, empresaId: number) {
    const caja = await this.findOne(id, empresaId);

    if (caja.estado !== EstadoCaja.ABIERTA) {
      throw new BadRequestException('La caja ya está cerrada');
    }

    const inicio = new Date(caja.abiertoEn);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);
    const fechaDia = new Date(inicio);

    return this.prisma.$transaction(async (tx) => {
      const cajaCerrada = await tx.caja.update({
        where:   { id },
        data:    { estado: EstadoCaja.CERRADA, montoCierre: dto.montoCierre, cerradoEn: new Date() },
        include: INCLUDE_CAJA,
      });

      const ventas = await tx.venta.findMany({
        where:  { almacenId: caja.almacenId, creadoEn: { gte: inicio, lte: fin }, estado: EstadoVenta.COMPLETADA },
        select: { total: true, metodoPago: true },
      });

      let montoTotal = 0, montoPorEfectivo = 0, montoPorYape = 0, montoTransferencia = 0, montoOtro = 0;
      for (const v of ventas) {
        const monto = Number(v.total);
        montoTotal += monto;
        if      (v.metodoPago === MetodoPago.EFECTIVO)       montoPorEfectivo    += monto;
        else if (v.metodoPago === MetodoPago.YAPE)           montoPorYape        += monto;
        else if (v.metodoPago === MetodoPago.TRANSFERENCIA)  montoTransferencia  += monto;
        else                                                 montoOtro           += monto;
      }

      const devoluciones = await tx.devolucion.findMany({
        where:   { venta: { almacenId: caja.almacenId }, creadoEn: { gte: inicio, lte: fin } },
        include: { items: { select: { montoDevuelto: true } } },
      });
      const totalDevoluciones = devoluciones.reduce(
        (acc, d) => acc + d.items.reduce((s, i) => s + Number(i.montoDevuelto), 0),
        0,
      );

      await tx.resumenDia.upsert({
        where:  { fecha_almacenId: { fecha: fechaDia, almacenId: caja.almacenId } },
        create: { fecha: fechaDia, almacenId: caja.almacenId, totalVentas: ventas.length, montoTotal, montoPorEfectivo, montoPorYape, montoTransferencia, montoOtro, totalDevoluciones },
        update: { totalVentas: ventas.length, montoTotal, montoPorEfectivo, montoPorYape, montoTransferencia, montoOtro, totalDevoluciones },
      });

      return cajaCerrada;
    });
  }

  async addMovimiento(cajaId: number, dto: CreateMovimientoCajaDto, empresaId: number) {
    const caja = await this.findOne(cajaId, empresaId);
    if (caja.estado !== EstadoCaja.ABIERTA) {
      throw new BadRequestException('No se pueden registrar movimientos en una caja cerrada');
    }
    return this.prisma.movimientoCaja.create({
      data: { cajaId, tipo: dto.tipo, monto: dto.monto, descripcion: dto.descripcion },
    });
  }

  async getMovimientos(cajaId: number, empresaId: number) {
    // Verificar que la caja pertenece a la empresa antes de devolver movimientos
    await this.findOne(cajaId, empresaId);
    return this.prisma.movimientoCaja.findMany({
      where:   { cajaId },
      orderBy: { creadoEn: 'desc' },
    });
  }
}
