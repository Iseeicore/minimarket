import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovRegistro, TipoMovStock } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/utils/paginate';
import { CreateRegistroAlmacenDto } from './dto/create-registro-almacen.dto';
import { FilterRegistroAlmacenDto } from './dto/filter-registro-almacen.dto';

const INCLUDE_REGISTRO = {
  almacen:  { select: { id: true, nombre: true } },
  variante: {
    include: {
      producto: { select: { id: true, nombre: true } },
      unidad:   { select: { id: true, abreviatura: true } },
    },
  },
  venta:   { select: { id: true, tipoComprobante: true, serie: true, nroComprobante: true } },
  usuario: { select: { id: true, nombre: true, rol: true } },
} satisfies Prisma.RegistroAlmacenInclude;

@Injectable()
export class RegistrosAlmacenService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: FilterRegistroAlmacenDto, empresaId: number) {
    const { page = 1, limit = 20, almacenId, tipo, desde, hasta } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.RegistroAlmacenWhereInput = {
      almacen:  { empresaId },
      devuelto: false,
      ...(almacenId && { almacenId }),
      ...(tipo      && { tipo }),
      ...(desde || hasta
        ? {
            creadoEn: {
              ...(desde && { gte: new Date(desde) }),
              ...(hasta && { lte: new Date(hasta) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.registroAlmacen.findMany({
        where,
        skip,
        take:    limit,
        include: INCLUDE_REGISTRO,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.registroAlmacen.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: number, empresaId: number) {
    const registro = await this.prisma.registroAlmacen.findFirst({
      where:   { id, almacen: { empresaId } },
      include: INCLUDE_REGISTRO,
    });
    if (!registro) throw new NotFoundException(`RegistroAlmacen #${id} no encontrado`);
    return registro;
  }

  // Todos los registros vinculados a una Venta (para que JEFE_ALMACEN seleccione cuál devolver)
  async findByVenta(ventaId: number, empresaId: number) {
    const venta = await this.prisma.venta.findFirst({
      where: { id: ventaId, almacen: { empresaId } },
    });
    if (!venta) throw new NotFoundException(`Venta #${ventaId} no encontrada`);

    return this.prisma.registroAlmacen.findMany({
      where:   { ventaId, almacen: { empresaId } },
      include: INCLUDE_REGISTRO,
      orderBy: { creadoEn: 'asc' },
    });
  }

  async create(dto: CreateRegistroAlmacenDto, usuarioId: number, empresaId: number) {
    return this.prisma.$transaction(async (tx) => {
      const almacen = await tx.almacen.findFirst({
        where: { id: dto.almacenId, empresaId },
      });
      if (!almacen) throw new NotFoundException(`Almacen #${dto.almacenId} no encontrado`);

      const variante = await tx.variante.findFirst({
        where: { id: dto.varianteId, activo: true },
      });
      if (!variante) throw new NotFoundException(`Variante #${dto.varianteId} no encontrada`);

      let cantidadAntes = 0;
      if (dto.tipo === TipoMovRegistro.TRANSFERENCIA) {
        const stock = await tx.stockAlmacen.findUnique({
          where: {
            almacenId_varianteId: { almacenId: dto.almacenId, varianteId: dto.varianteId },
          },
        });
        cantidadAntes = stock?.cantidad ?? 0;
        if (cantidadAntes < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para transferencia. Disponible: ${cantidadAntes}`,
          );
        }
      }

      const registro = await tx.registroAlmacen.create({
        data: {
          almacenId:  dto.almacenId,
          varianteId: dto.varianteId,
          cantidad:   dto.cantidad,
          tipo:       dto.tipo,
          notas:      dto.notas,
          creadoPor:  usuarioId,
        },
        include: INCLUDE_REGISTRO,
      });

      if (dto.tipo === TipoMovRegistro.TRANSFERENCIA) {
        await tx.stockAlmacen.update({
          where: {
            almacenId_varianteId: { almacenId: dto.almacenId, varianteId: dto.varianteId },
          },
          data: { cantidad: { decrement: dto.cantidad } },
        });

        await tx.movimientoStock.create({
          data: {
            almacenId:       dto.almacenId,
            varianteId:      dto.varianteId,
            tipo:            TipoMovStock.TRANSFERENCIA_SALIDA,
            referenciaTipo:  'RegistroAlmacen',
            referenciaId:    registro.id,
            cantidad:        dto.cantidad,
            cantidadAntes,
            cantidadDespues: cantidadAntes - dto.cantidad,
            creadoPor:       usuarioId,
          },
        });
      }

      return registro;
    });
  }

  // Marca el registro como devuelto — lo excluye del listado activo y de la sincronización
  async marcarDevuelto(id: number, usuarioId: number, empresaId: number) {
    const registro = await this.prisma.registroAlmacen.findFirst({
      where: { id, almacen: { empresaId } },
    });
    if (!registro) throw new NotFoundException(`RegistroAlmacen #${id} no encontrado`);
    if (registro.devuelto) {
      throw new BadRequestException('Este registro ya fue marcado como devuelto');
    }

    return this.prisma.registroAlmacen.update({
      where:   { id },
      data:    { devuelto: true, notas: registro.notas ? `${registro.notas} | Devuelto por usuario #${usuarioId}` : `Devuelto por usuario #${usuarioId}` },
      include: INCLUDE_REGISTRO,
    });
  }

  // -------------------------------------------------------------------------
  // Movimientos del almacén (SALIDA + TRANSFERENCIA) de las últimas N horas
  // que no tienen contrapartida suficiente en el cuaderno de tienda.
  // Sirve como indicador de "pendientes de registrar" para el JEFE_VENTA.
  // -------------------------------------------------------------------------
  async pendientesTienda(almacenId: number, horas: number, empresaId: number) {
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: almacenId, empresaId },
    });
    if (!almacen) throw new NotFoundException(`Almacen #${almacenId} no encontrado`);

    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);

    const [salidaAlmacen, devAlmacen, entradaTienda, devTienda] = await Promise.all([
      // Salidas brutas del almacén
      this.prisma.registroAlmacen.groupBy({
        by:   ['varianteId'],
        where: {
          almacenId,
          devuelto: false,
          tipo:     { in: [TipoMovRegistro.SALIDA, TipoMovRegistro.TRANSFERENCIA] },
          creadoEn: { gte: desde },
        },
        _sum: { cantidad: true },
      }),
      // Devoluciones del almacén en el período
      this.prisma.registroAlmacen.groupBy({
        by:   ['varianteId'],
        where: {
          almacenId,
          tipo:     TipoMovRegistro.DEVOLUCION,
          creadoEn: { gte: desde },
        },
        _sum: { cantidad: true },
      }),
      // Entradas del cuaderno tienda (excluye devoluciones)
      this.prisma.registroTienda.groupBy({
        by:   ['varianteId'],
        where: {
          almacenId,
          devuelto: false,
          tipo:     { not: TipoMovRegistro.DEVOLUCION },
          creadoEn: { gte: desde },
        },
        _sum: { cantidad: true },
      }),
      // Devoluciones auto-creadas en el cuaderno tienda
      this.prisma.registroTienda.groupBy({
        by:   ['varianteId'],
        where: {
          almacenId,
          tipo:     TipoMovRegistro.DEVOLUCION,
          creadoEn: { gte: desde },
        },
        _sum: { cantidad: true },
      }),
    ]);

    // Neto almacén = salida bruta - devoluciones almacén
    const mapaDevAlmacen = new Map<number, number>();
    for (const r of devAlmacen) {
      mapaDevAlmacen.set(r.varianteId, r._sum.cantidad ?? 0);
    }

    // Neto tienda = entradas tienda - devoluciones tienda
    const mapaDevTienda = new Map<number, number>();
    for (const r of devTienda) {
      mapaDevTienda.set(r.varianteId, r._sum.cantidad ?? 0);
    }
    const mapaTienda = new Map<number, number>();
    for (const r of entradaTienda) {
      const dev  = mapaDevTienda.get(r.varianteId) ?? 0;
      const neto = (r._sum.cantidad ?? 0) - dev;
      mapaTienda.set(r.varianteId, Math.max(0, neto));
    }

    // Comparar almacén-neto vs tienda-neto
    const pendientes = salidaAlmacen
      .map(r => {
        const devA           = mapaDevAlmacen.get(r.varianteId) ?? 0;
        const cantidadAlmacen = Math.max(0, (r._sum.cantidad ?? 0) - devA);
        const cantidadTienda  = mapaTienda.get(r.varianteId) ?? 0;
        return {
          varianteId:      r.varianteId,
          cantidadAlmacen,
          cantidadTienda,
          pendiente: cantidadAlmacen - cantidadTienda,
        };
      })
      .filter(r => r.pendiente > 0);

    if (pendientes.length === 0) return [];

    // Enriquecer con datos de variante y producto
    const varianteIds = pendientes.map(p => p.varianteId);
    const variantes   = await this.prisma.variante.findMany({
      where:   { id: { in: varianteIds } },
      include: {
        producto: { select: { id: true, nombre: true } },
        unidad:   { select: { id: true, abreviatura: true } },
      },
    });

    const mapaVariantes = new Map(variantes.map(v => [v.id, v]));

    return pendientes.map(p => ({
      ...p,
      variante: mapaVariantes.get(p.varianteId),
    }));
  }

  // -------------------------------------------------------------------------
  // Llamado internamente desde VentasService — misma transacción
  // -------------------------------------------------------------------------
  async createDesdeVenta(
    tx: Prisma.TransactionClient,
    items: Array<{ varianteId: number; cantidad: number }>,
    almacenId: number,
    usuarioId: number,
    ventaId: number,
  ) {
    await Promise.all(
      items.map((item) =>
        tx.registroAlmacen.create({
          data: {
            almacenId,
            varianteId: item.varianteId,
            cantidad:   item.cantidad,
            tipo:       TipoMovRegistro.SALIDA,
            ventaId,
            notas:      `Generado desde Venta #${ventaId}`,
            creadoPor:  usuarioId,
          },
        }),
      ),
    );
  }
}
