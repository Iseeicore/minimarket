import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/paginate';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  findAll(empresaId: number) {
    return this.prisma.stockAlmacen.findMany({
      where:   { almacen: { empresaId } },
      include: {
        almacen:  { select: { id: true, nombre: true } },
        variante: { include: { producto: true, unidad: true } },
      },
      orderBy: { almacenId: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const stock = await this.prisma.stockAlmacen.findFirst({
      where:   { id, almacen: { empresaId } },
      include: {
        almacen:  { select: { id: true, nombre: true } },
        variante: { include: { producto: true, unidad: true } },
      },
    });
    if (!stock) throw new NotFoundException(`Stock #${id} no encontrado`);
    return stock;
  }

  /**
   * Stock dual: combina StockAlmacen y StockTienda en una respuesta unificada.
   * El frontend usa esto para mostrar: Almacén X | Tienda Y | Total Z
   */
  async findDual(almacenId: number, empresaId: number) {
    // Inicio del día UTC (para filtrar órdenes de hoy)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [stockAlmacen, stockTienda, salidasHoy, ingresosHoy] = await Promise.all([
      this.prisma.stockAlmacen.findMany({
        where: { almacenId, almacen: { empresaId } },
        include: {
          variante: {
            include: {
              producto: { select: { id: true, nombre: true } },
              unidad: { select: { id: true, nombre: true, abreviatura: true } },
            },
          },
        },
      }),
      this.prisma.stockTienda.findMany({
        where: { almacenId, almacen: { empresaId } },
      }),
      // Salidas del día: cuánto salió por variante (órdenes de hoy)
      this.prisma.ordenSalidaDetalle.groupBy({
        by: ['varianteId'],
        where: {
          ordenSalida: {
            almacenId,
            almacen: { empresaId },
            creadoEn: { gte: hoy },
          },
        },
        _sum: { cantidad: true },
      }),
      // Ingresos del día: compras + devoluciones de hoy
      this.prisma.movimientoStock.groupBy({
        by: ['varianteId'],
        where: {
          almacenId,
          almacen: { empresaId },
          tipo: { in: ['COMPRA_ENTRADA', 'DEVOLUCION_ENTRADA'] },
          creadoEn: { gte: hoy },
        },
        _sum: { cantidad: true },
      }),
    ]);

    // Indexar por varianteId para O(1) lookup
    const tiendaMap   = new Map(stockTienda.map((s) => [s.varianteId, s.cantidad]));
    const salidaMap   = new Map(salidasHoy.map((s) => [s.varianteId, s._sum.cantidad ?? 0]));
    const ingresoMap  = new Map(ingresosHoy.map((s) => [s.varianteId, s._sum.cantidad ?? 0]));

    return stockAlmacen.map((sa) => {
      const tienda      = tiendaMap.get(sa.varianteId) ?? 0;
      const total       = sa.cantidad + tienda;
      const salidaHoy   = salidaMap.get(sa.varianteId) ?? 0;
      const ingresoHoy  = ingresoMap.get(sa.varianteId) ?? 0;
      // Stock real al inicio del día = actual + lo que salió - lo que entró
      const inicioReal  = total + salidaHoy - ingresoHoy;
      // Si hubo ingreso que supera el inicio, la barra se resetea (100%+)
      const inicioHoy   = Math.max(inicioReal, 1);

      return {
        varianteId:  sa.varianteId,
        almacen:     sa.cantidad,
        tienda,
        total,
        inicioHoy,
        salidaHoy,
        ingresoHoy,
        stockMinimo: sa.variante?.stockMinimo ?? 0,
        variante:    sa.variante,
      };
    });
  }

  findByAlmacen(almacenId: number, empresaId: number) {
    return this.prisma.stockAlmacen.findMany({
      where:   { almacenId, almacen: { empresaId } },
      include: { variante: { include: { producto: true, unidad: true } } },
      orderBy: { variante: { nombre: 'asc' } },
    });
  }

  async findMovimientos({ page = 1, limit = 20 }: PaginationDto, empresaId: number, almacenId?: number) {
    const skip  = (page - 1) * limit;
    const where = {
      almacen: { empresaId },
      ...(almacenId && { almacenId }),
    };
    const [data, total] = await Promise.all([
      this.prisma.movimientoStock.findMany({
        where,
        skip,
        take:    limit,
        include: {
          almacen:  { select: { id: true, nombre: true } },
          variante: { include: { producto: true } },
          usuario:  { select: { id: true, nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.movimientoStock.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }
}
