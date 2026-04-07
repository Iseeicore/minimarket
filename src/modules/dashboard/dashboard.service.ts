import { Injectable } from '@nestjs/common';
import { EstadoVenta } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDayLima, endOfDayLima, todayLima, toDateLima } from '../../common/utils/timezone';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStockBajo(empresaId: number) {
    const stocks = await this.prisma.stockAlmacen.findMany({
      where: { almacen: { empresaId } },
      include: {
        variante: { include: { producto: true, unidad: true } },
        almacen:  { select: { id: true, nombre: true } },
      },
    });
    return stocks.filter((s) => s.cantidad <= s.variante.stockMinimo);
  }

  async getVentasSemana(empresaId: number) {
    const hoyStr = todayLima();
    const hoyInicio = startOfDayLima(hoyStr);

    // Hace 6 días en Lima
    const d6 = new Date(hoyInicio.getTime() - 6 * 24 * 60 * 60 * 1000);
    const hace6Str = toDateLima(d6);
    const hace6Dias = startOfDayLima(hace6Str);

    const porDia: Record<string, { fecha: string; total: number; cantidad: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoyInicio.getTime() - i * 24 * 60 * 60 * 1000);
      const key = toDateLima(d);
      porDia[key] = { fecha: key, total: 0, cantidad: 0 };
    }

    // Días cerrados: leer de ResumenDia (pre-computado al cerrar caja)
    const resumenes = await this.prisma.resumenDia.findMany({
      where: {
        almacen: { empresaId },
        fecha:   { gte: hace6Dias, lt: hoyInicio },
      },
    });

    for (const r of resumenes) {
      const key = toDateLima(new Date(r.fecha));
      if (porDia[key]) {
        porDia[key].total    += Number(r.montoTotal);
        porDia[key].cantidad += r.totalVentas;
      }
    }

    // Hoy: query live (la caja puede estar aún abierta)
    const finHoy = endOfDayLima(hoyStr);

    const ventasHoy = await this.prisma.venta.aggregate({
      where: {
        almacen:  { empresaId },
        creadoEn: { gte: hoyInicio, lte: finHoy },
        estado:   EstadoVenta.COMPLETADA,
      },
      _sum:   { total: true },
      _count: { id: true },
    });

    porDia[hoyStr].total    = Number(ventasHoy._sum.total ?? 0);
    porDia[hoyStr].cantidad = ventasHoy._count.id;

    return Object.values(porDia);
  }

  async getListaDia(empresaId: number, fecha?: string) {
    const dia    = fecha ?? todayLima();
    const inicio = startOfDayLima(dia);
    const fin    = endOfDayLima(dia);

    const items = await this.prisma.itemVenta.findMany({
      where: {
        venta: {
          almacen: { empresaId },
          creadoEn: { gte: inicio, lte: fin },
          estado:   EstadoVenta.COMPLETADA,
        },
      },
      include: {
        variante: { include: { producto: true, unidad: true } },
      },
    });

    const agrupado: Record<
      number,
      {
        varianteId:     number;
        nombre:         string;
        producto:       string;
        unidad:         string;
        totalCantidad:  number;
        precioUnitario: number;
        totalSubtotal:  number;
      }
    > = {};

    for (const item of items) {
      if (!agrupado[item.varianteId]) {
        agrupado[item.varianteId] = {
          varianteId:     item.varianteId,
          nombre:         item.variante.nombre,
          producto:       item.variante.producto.nombre,
          unidad:         item.variante.unidad.abreviatura,
          totalCantidad:  0,
          precioUnitario: Number(item.precioUnitario),
          totalSubtotal:  0,
        };
      }
      agrupado[item.varianteId].totalCantidad += item.cantidad;
      agrupado[item.varianteId].totalSubtotal += Number(item.subtotal);
    }

    return Object.values(agrupado).sort((a, b) => a.producto.localeCompare(b.producto));
  }

  async getListaDiaCruda(empresaId: number, fecha?: string) {
    const dia    = fecha ?? todayLima();
    const inicio = startOfDayLima(dia);
    const fin    = endOfDayLima(dia);

    const items = await this.prisma.itemVenta.findMany({
      where: {
        venta: {
          almacen: { empresaId },
          creadoEn: { gte: inicio, lte: fin },
          estado:   EstadoVenta.COMPLETADA,
        },
      },
      include: {
        variante: { include: { producto: true, unidad: true } },
        venta:    { select: { id: true, creadoEn: true, metodoPago: true, tipoComprobante: true } },
      },
      orderBy: { venta: { creadoEn: 'asc' } },
    });

    return items.map((item) => ({
      ventaId:        item.ventaId,
      hora:           item.venta.creadoEn,
      metodoPago:     item.venta.metodoPago,
      tipoComprobante: item.venta.tipoComprobante,
      varianteId:     item.varianteId,
      producto:       item.variante.producto.nombre,
      variante:       item.variante.nombre,
      unidad:         item.variante.unidad.abreviatura,
      cantidad:       item.cantidad,
      precioUnitario: Number(item.precioUnitario),
      subtotal:       Number(item.subtotal),
    }));
  }

  async getHistorico(empresaId: number, page: number, limit: number, almacenId?: number) {
    const skip = (page - 1) * limit;

    const where = {
      almacen: { empresaId },
      ...(almacenId && { almacenId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.resumenDia.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { fecha: 'desc' },
        include: { almacen: { select: { id: true, nombre: true } } },
      }),
      this.prisma.resumenDia.count({ where }),
    ]);

    return {
      data: data.map((r) => ({
        id:                 r.id,
        fecha:              r.fecha,
        almacen:            r.almacen.nombre,
        almacenId:          r.almacenId,
        totalVentas:        r.totalVentas,
        montoTotal:         Number(r.montoTotal),
        montoPorEfectivo:   Number(r.montoPorEfectivo),
        montoPorYape:       Number(r.montoPorYape),
        montoTransferencia: Number(r.montoTransferencia),
        montoOtro:          Number(r.montoOtro),
        totalDevoluciones:  Number(r.totalDevoluciones),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getValorInventario(empresaId: number) {
    const stocks = await this.prisma.stockAlmacen.findMany({
      where:   { almacen: { empresaId } },
      include: { variante: true },
    });

    const total = stocks.reduce(
      (acc, s) => acc + s.cantidad * Number(s.variante.precioVenta),
      0,
    );

    return { valorTotal: parseFloat(total.toFixed(2)) };
  }

  async getTopVariantes(empresaId: number) {
    const hoyLima = todayLima(); // 'YYYY-MM-DD'
    const inicioMes = startOfDayLima(`${hoyLima.slice(0, 8)}01`);

    const items = await this.prisma.itemVenta.groupBy({
      by: ['varianteId'],
      where: {
        venta: {
          almacen:  { empresaId },
          creadoEn: { gte: inicioMes },
          estado:   EstadoVenta.COMPLETADA,
        },
      },
      _sum:     { cantidad: true, subtotal: true },
      orderBy:  { _sum: { cantidad: 'desc' } },
      take:     10,
    });

    const variantesIds = items.map((i) => i.varianteId);
    const variantes = await this.prisma.variante.findMany({
      where:   { id: { in: variantesIds } },
      include: { producto: true, unidad: true },
    });

    return items.map((item) => {
      const variante = variantes.find((v) => v.id === item.varianteId)!;
      return {
        varianteId:    item.varianteId,
        nombre:        variante.nombre,
        producto:      variante.producto.nombre,
        unidad:        variante.unidad.abreviatura,
        totalCantidad: item._sum.cantidad ?? 0,
        totalSubtotal: Number(item._sum.subtotal ?? 0),
      };
    });
  }

  async getResumenCajas(empresaId: number) {
    const cajas = await this.prisma.caja.findMany({
      where:   { almacen: { empresaId } },
      include: {
        almacen:     { select: { id: true, nombre: true } },
        usuario:     { select: { id: true, nombre: true } },
        movimientos: true,
      },
      orderBy: { abiertoEn: 'desc' },
      take:    10,
    });

    return cajas.map((caja) => {
      const ingresos = caja.movimientos
        .filter((m) => m.tipo === 'INGRESO')
        .reduce((acc, m) => acc + Number(m.monto), 0);
      const egresos = caja.movimientos
        .filter((m) => m.tipo === 'EGRESO')
        .reduce((acc, m) => acc + Number(m.monto), 0);

      return {
        id:             caja.id,
        almacen:        caja.almacen.nombre,
        usuario:        caja.usuario.nombre,
        estado:         caja.estado,
        montoApertura:  Number(caja.montoApertura),
        ingresos,
        egresos,
        saldoEsperado:  Number(caja.montoApertura) + ingresos - egresos,
        abiertoEn:      caja.abiertoEn,
        cerradoEn:      caja.cerradoEn,
      };
    });
  }

  async getSummary(empresaId: number) {
    const [stockBajo, ventasSemana, listaDia, valorInventario, topVariantes, cajas] =
      await Promise.all([
        this.getStockBajo(empresaId),
        this.getVentasSemana(empresaId),
        this.getListaDia(empresaId),
        this.getValorInventario(empresaId),
        this.getTopVariantes(empresaId),
        this.getResumenCajas(empresaId),
      ]);

    return { stockBajo, ventasSemana, listaDia, valorInventario, topVariantes, cajas };
  }
}
