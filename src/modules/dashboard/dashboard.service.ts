import { Injectable } from '@nestjs/common';
import { EstadoVenta } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStockBajo() {
    const stocks = await this.prisma.stockAlmacen.findMany({
      include: {
        variante: { include: { producto: true, unidad: true } },
        almacen: true,
      },
    });
    return stocks.filter((s) => s.cantidad <= s.variante.stockMinimo);
  }

  // Lee de ResumenDia para días cerrados — live desde Venta solo para hoy
  async getVentasSemana() {
    const hace6Dias = new Date();
    hace6Dias.setDate(hace6Dias.getDate() - 6);
    hace6Dias.setHours(0, 0, 0, 0);

    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    // Construir el array de 7 días vacío
    const porDia: Record<string, { fecha: string; total: number; cantidad: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      porDia[key] = { fecha: key, total: 0, cantidad: 0 };
    }

    // Días cerrados: leer de ResumenDia (pre-computado al cerrar caja)
    const resumenes = await this.prisma.resumenDia.findMany({
      where: { fecha: { gte: hace6Dias, lt: hoyInicio } },
    });

    for (const r of resumenes) {
      const key = new Date(r.fecha).toISOString().slice(0, 10);
      if (porDia[key]) {
        porDia[key].total    = Number(r.montoTotal);
        porDia[key].cantidad = r.totalVentas;
      }
    }

    // Hoy: query live (la caja puede estar aún abierta)
    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    const ventasHoy = await this.prisma.venta.aggregate({
      where: {
        creadoEn: { gte: hoyInicio, lte: finHoy },
        estado: EstadoVenta.COMPLETADA,
      },
      _sum: { total: true },
      _count: { id: true },
    });

    const todayKey = new Date().toISOString().slice(0, 10);
    porDia[todayKey].total    = Number(ventasHoy._sum.total ?? 0);
    porDia[todayKey].cantidad = ventasHoy._count.id;

    return Object.values(porDia);
  }

  // Acepta ?fecha=YYYY-MM-DD para consultar días históricos — hoy si no se pasa
  async getListaDia(fecha?: string) {
    const base  = fecha ? new Date(fecha) : new Date();
    const inicio = new Date(base); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(base); fin.setHours(23, 59, 59, 999);

    const items = await this.prisma.itemVenta.findMany({
      where: {
        venta: {
          creadoEn: { gte: inicio, lte: fin },
          estado: EstadoVenta.COMPLETADA,
        },
      },
      include: {
        variante: { include: { producto: true, unidad: true } },
      },
    });

    const agrupado: Record<
      number,
      {
        varianteId: number;
        nombre: string;
        producto: string;
        unidad: string;
        totalCantidad: number;
        precioUnitario: number;
        totalSubtotal: number;
      }
    > = {};

    for (const item of items) {
      if (!agrupado[item.varianteId]) {
        agrupado[item.varianteId] = {
          varianteId: item.varianteId,
          nombre: item.variante.nombre,
          producto: item.variante.producto.nombre,
          unidad: item.variante.unidad.abreviatura,
          totalCantidad: 0,
          precioUnitario: Number(item.precioUnitario),
          totalSubtotal: 0,
        };
      }
      agrupado[item.varianteId].totalCantidad += item.cantidad;
      agrupado[item.varianteId].totalSubtotal += Number(item.subtotal);
    }

    return Object.values(agrupado).sort((a, b) =>
      a.producto.localeCompare(b.producto),
    );
  }

  // Acepta ?fecha=YYYY-MM-DD para consultar días históricos — hoy si no se pasa
  async getListaDiaCruda(fecha?: string) {
    const base  = fecha ? new Date(fecha) : new Date();
    const inicio = new Date(base); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(base); fin.setHours(23, 59, 59, 999);

    const items = await this.prisma.itemVenta.findMany({
      where: {
        venta: {
          creadoEn: { gte: inicio, lte: fin },
          estado: EstadoVenta.COMPLETADA,
        },
      },
      include: {
        variante: { include: { producto: true, unidad: true } },
        venta: { select: { id: true, creadoEn: true, metodoPago: true } },
      },
      orderBy: { venta: { creadoEn: 'asc' } },
    });

    return items.map((item) => ({
      ventaId: item.ventaId,
      hora: item.venta.creadoEn,
      metodoPago: item.venta.metodoPago,
      varianteId: item.varianteId,
      producto: item.variante.producto.nombre,
      variante: item.variante.nombre,
      unidad: item.variante.unidad.abreviatura,
      cantidad: item.cantidad,
      precioUnitario: Number(item.precioUnitario),
      subtotal: Number(item.subtotal),
    }));
  }

  // Histórico paginado de ResumenDia — para gráficos y tabla de tendencias
  async getHistorico(page: number, limit: number, almacenId?: number) {
    const skip = (page - 1) * limit;

    const where = almacenId ? { almacenId } : {};

    const [data, total] = await Promise.all([
      this.prisma.resumenDia.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: { almacen: { select: { id: true, nombre: true } } },
      }),
      this.prisma.resumenDia.count({ where }),
    ]);

    return {
      data: data.map((r) => ({
        id: r.id,
        fecha: r.fecha,
        almacen: r.almacen.nombre,
        almacenId: r.almacenId,
        totalVentas: r.totalVentas,
        montoTotal: Number(r.montoTotal),
        montoPorEfectivo: Number(r.montoPorEfectivo),
        montoPorYape: Number(r.montoPorYape),
        montoTransferencia: Number(r.montoTransferencia),
        montoOtro: Number(r.montoOtro),
        totalDevoluciones: Number(r.totalDevoluciones),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getValorInventario() {
    const stocks = await this.prisma.stockAlmacen.findMany({
      include: { variante: true },
    });

    const total = stocks.reduce(
      (acc, s) => acc + s.cantidad * Number(s.variante.precioVenta),
      0,
    );

    return { valorTotal: total };
  }

  async getTopVariantes() {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const items = await this.prisma.itemVenta.groupBy({
      by: ['varianteId'],
      where: {
        venta: {
          creadoEn: { gte: inicioMes },
          estado: EstadoVenta.COMPLETADA,
        },
      },
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: 10,
    });

    const variantesIds = items.map((i) => i.varianteId);
    const variantes = await this.prisma.variante.findMany({
      where: { id: { in: variantesIds } },
      include: { producto: true, unidad: true },
    });

    return items.map((item) => {
      const variante = variantes.find((v) => v.id === item.varianteId)!;
      return {
        varianteId: item.varianteId,
        nombre: variante.nombre,
        producto: variante.producto.nombre,
        unidad: variante.unidad.abreviatura,
        totalCantidad: item._sum.cantidad ?? 0,
        totalSubtotal: Number(item._sum.subtotal ?? 0),
      };
    });
  }

  async getResumenCajas() {
    const cajas = await this.prisma.caja.findMany({
      include: {
        almacen: true,
        usuario: { select: { id: true, nombre: true } },
        movimientos: true,
      },
      orderBy: { abiertoEn: 'desc' },
      take: 10,
    });

    return cajas.map((caja) => {
      const ingresos = caja.movimientos
        .filter((m) => m.tipo === 'INGRESO')
        .reduce((acc, m) => acc + Number(m.monto), 0);
      const egresos = caja.movimientos
        .filter((m) => m.tipo === 'EGRESO')
        .reduce((acc, m) => acc + Number(m.monto), 0);

      return {
        id: caja.id,
        almacen: caja.almacen.nombre,
        usuario: caja.usuario.nombre,
        estado: caja.estado,
        montoApertura: Number(caja.montoApertura),
        ingresos,
        egresos,
        saldoEsperado: Number(caja.montoApertura) + ingresos - egresos,
        abiertoEn: caja.abiertoEn,
        cerradoEn: caja.cerradoEn,
      };
    });
  }

  async getSummary() {
    const [stockBajo, ventasSemana, listaDia, valorInventario, topVariantes, cajas] =
      await Promise.all([
        this.getStockBajo(),
        this.getVentasSemana(),
        this.getListaDia(),
        this.getValorInventario(),
        this.getTopVariantes(),
        this.getResumenCajas(),
      ]);

    return {
      stockBajo,
      ventasSemana,
      listaDia,
      valorInventario,
      topVariantes,
      cajas,
    };
  }
}
