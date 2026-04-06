import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoReconciliacion,
  EstadoSincronizacion,
  Prisma,
  TipoMovRegistro,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/utils/paginate';
import { CreateSincronizacionDto } from './dto/create-sincronizacion.dto';
import { FilterSincronizacionDto } from './dto/filter-sincronizacion.dto';
import { ResolverItemDto } from './dto/resolver-item.dto';

const INCLUDE_SINCRONIZACION = {
  almacen:  { select: { id: true, nombre: true } },
  ejecutor: { select: { id: true, nombre: true, rol: true } },
} satisfies Prisma.SincronizacionInclude;

const INCLUDE_SINCRONIZACION_DETALLE = {
  ...INCLUDE_SINCRONIZACION,
  reconciliacion: {
    include: {
      variante: {
        include: {
          producto: { select: { id: true, nombre: true } },
          unidad:   { select: { id: true, abreviatura: true } },
        },
      },
      resolvedor: { select: { id: true, nombre: true } },
    },
    orderBy: { diferencia: 'asc' as const },
  },
} satisfies Prisma.SincronizacionInclude;

@Injectable()
export class SincronizacionService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: FilterSincronizacionDto, empresaId: number) {
    const { page = 1, limit = 20, almacenId, estado, tipo } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.SincronizacionWhereInput = {
      almacen: { empresaId },
      ...(almacenId && { almacenId }),
      ...(estado    && { estado }),
      ...(tipo      && { tipo }),
    };

    const [data, total] = await Promise.all([
      this.prisma.sincronizacion.findMany({
        where,
        skip,
        take: limit,
        include: INCLUDE_SINCRONIZACION,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.sincronizacion.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: number, empresaId: number) {
    const sinc = await this.prisma.sincronizacion.findFirst({
      where: { id, almacen: { empresaId } },
      include: INCLUDE_SINCRONIZACION_DETALLE,
    });
    if (!sinc) throw new NotFoundException(`Sincronizacion #${id} no encontrada`);
    return sinc;
  }

  // -------------------------------------------------------------------------
  // Ejecutar sincronización: compara RegistroAlmacen vs RegistroTienda
  // en el período indicado y genera ReconciliacionItem por variante
  // -------------------------------------------------------------------------
  async ejecutar(dto: CreateSincronizacionDto, usuarioId: number, empresaId: number) {
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenId, empresaId },
    });
    if (!almacen) throw new NotFoundException(`Almacen #${dto.almacenId} no encontrado`);

    const desde = new Date(dto.desde);
    const hasta = new Date(dto.hasta);

    if (desde >= hasta) {
      throw new BadRequestException('La fecha "desde" debe ser anterior a "hasta"');
    }

    return this.prisma.$transaction(async (tx) => {
      // Crear la sincronización en estado EN_PROCESO
      const sinc = await tx.sincronizacion.create({
        data: {
          almacenId: dto.almacenId,
          tipo: dto.tipo,
          estado: EstadoSincronizacion.EN_PROCESO,
          periodoDesde: desde,
          periodoHasta: hasta,
          ejecutadoPor: usuarioId,
        },
      });

      // Sumar salidas brutas por variante en RegistroAlmacen
      // Solo SALIDA y TRANSFERENCIA — ENTRADA y DEVOLUCION se tratan por separado
      const [registrosAlmacen, registrosDevoluciones, registrosTienda, devolucionesTienda] = await Promise.all([
        tx.registroAlmacen.groupBy({
          by: ['varianteId'],
          where: {
            almacenId: dto.almacenId,
            devuelto:  false,
            tipo:      { in: [TipoMovRegistro.SALIDA, TipoMovRegistro.TRANSFERENCIA] },
            creadoEn:  { gte: desde, lte: hasta },
          },
          _sum: { cantidad: true },
        }),
        // Devoluciones formales en el mismo período: se restan para obtener salida neta
        // Ejemplo: SALIDA(6) - DEVOLUCION(5) = 1 unidad que realmente salió del almacén
        tx.registroAlmacen.groupBy({
          by: ['varianteId'],
          where: {
            almacenId: dto.almacenId,
            tipo:      TipoMovRegistro.DEVOLUCION,
            creadoEn:  { gte: desde, lte: hasta },
          },
          _sum: { cantidad: true },
        }),
        // Sumar cantidades activas (devuelto: false, no-DEVOLUCION) por variante en RegistroTienda
        tx.registroTienda.groupBy({
          by: ['varianteId'],
          where: {
            almacenId: dto.almacenId,
            devuelto:  false,
            tipo:      { not: TipoMovRegistro.DEVOLUCION },
            creadoEn:  { gte: desde, lte: hasta },
          },
          _sum: { cantidad: true },
        }),
        // Devoluciones en tienda (auto-creadas al procesar devolución formal)
        tx.registroTienda.groupBy({
          by: ['varianteId'],
          where: {
            almacenId: dto.almacenId,
            tipo:      TipoMovRegistro.DEVOLUCION,
            creadoEn:  { gte: desde, lte: hasta },
          },
          _sum: { cantidad: true },
        }),
      ]);

      // Construir mapa de devoluciones almacén para restar O(1)
      const mapaDevoluciones = new Map<number, number>();
      for (const r of registrosDevoluciones) {
        mapaDevoluciones.set(r.varianteId, r._sum.cantidad ?? 0);
      }

      // Construir mapa almacén con cantidad NETA = salida bruta - devoluciones
      const mapaAlmacen = new Map<number, number>();
      for (const r of registrosAlmacen) {
        const devuelto = mapaDevoluciones.get(r.varianteId) ?? 0;
        const neto     = (r._sum.cantidad ?? 0) - devuelto;
        if (neto > 0) mapaAlmacen.set(r.varianteId, neto);
      }

      // Construir mapa tienda con cantidad NETA = entradas - devoluciones tienda
      const mapaDevTienda = new Map<number, number>();
      for (const r of devolucionesTienda) {
        mapaDevTienda.set(r.varianteId, r._sum.cantidad ?? 0);
      }

      const mapaTienda = new Map<number, number>();
      for (const r of registrosTienda) {
        const devTienda = mapaDevTienda.get(r.varianteId) ?? 0;
        const neto      = (r._sum.cantidad ?? 0) - devTienda;
        if (neto > 0) mapaTienda.set(r.varianteId, neto);
      }
      // Variantes con solo devoluciones en tienda (sin entradas previas en el período)
      for (const [varianteId] of mapaDevTienda) {
        if (!mapaTienda.has(varianteId)) mapaTienda.set(varianteId, 0);
      }

      // Unión de todas las variantes que aparecen en cualquiera de los dos lados
      const todasVariantes = new Set([
        ...mapaAlmacen.keys(),
        ...mapaTienda.keys(),
      ]);

      if (todasVariantes.size === 0) {
        // Sin movimientos en el período — completar sin items
        await tx.sincronizacion.update({
          where: { id: sinc.id },
          data: {
            estado:            EstadoSincronizacion.COMPLETADA,
            totalCoincidencias: 0,
            totalDiferencias:   0,
            completadoEn:       new Date(),
          },
        });
        return tx.sincronizacion.findUnique({
          where: { id: sinc.id },
          include: INCLUDE_SINCRONIZACION_DETALLE,
        });
      }

      // Generar items de reconciliación
      let totalCoincidencias = 0;
      let totalDiferencias   = 0;

      const itemsData: Prisma.ReconciliacionItemCreateManyInput[] = [];

      for (const varianteId of todasVariantes) {
        const cantidadAlmacen = mapaAlmacen.get(varianteId) ?? 0;
        const cantidadTienda  = mapaTienda.get(varianteId)  ?? 0;
        const diferencia      = cantidadAlmacen - cantidadTienda;

        let estado: EstadoReconciliacion;
        if (diferencia === 0) {
          estado = EstadoReconciliacion.COINCIDE;
          totalCoincidencias++;
        } else if (cantidadTienda === 0) {
          // Almacén registró movimientos pero tienda no anotó nada
          estado = EstadoReconciliacion.SIN_CONTRAPARTIDA;
          totalDiferencias++;
        } else {
          estado = EstadoReconciliacion.DIFERENCIA;
          totalDiferencias++;
        }

        itemsData.push({
          sincronizacionId: sinc.id,
          varianteId,
          cantidadAlmacen,
          cantidadTienda,
          diferencia,
          estado,
        });
      }

      await tx.reconciliacionItem.createMany({ data: itemsData });

      const estadoFinal = totalDiferencias > 0
        ? EstadoSincronizacion.CON_DIFERENCIAS
        : EstadoSincronizacion.COMPLETADA;

      await tx.sincronizacion.update({
        where: { id: sinc.id },
        data: {
          estado: estadoFinal,
          totalCoincidencias,
          totalDiferencias,
          completadoEn: new Date(),
        },
      });

      return tx.sincronizacion.findUnique({
        where: { id: sinc.id },
        include: INCLUDE_SINCRONIZACION_DETALLE,
      });
    });
  }

  // -------------------------------------------------------------------------
  // Resolución manual: el JEFE_VENTA justifica o acepta una diferencia puntual
  // -------------------------------------------------------------------------
  async resolverItem(
    sincronizacionId: number,
    itemId: number,
    dto: ResolverItemDto,
    usuarioId: number,
    empresaId: number,
  ) {
    // Verificar que la sincronización pertenece a la empresa
    const sinc = await this.prisma.sincronizacion.findFirst({
      where: { id: sincronizacionId, almacen: { empresaId } },
    });
    if (!sinc) throw new NotFoundException(`Sincronizacion #${sincronizacionId} no encontrada`);

    const item = await this.prisma.reconciliacionItem.findFirst({
      where: { id: itemId, sincronizacionId },
    });
    if (!item) throw new NotFoundException(`Item #${itemId} no encontrado en esta sincronización`);

    if (item.estado === EstadoReconciliacion.COINCIDE) {
      throw new BadRequestException('Este item ya coincide, no requiere resolución');
    }

    return this.prisma.reconciliacionItem.update({
      where: { id: itemId },
      data: {
        estado:     dto.estado,
        notas:      dto.notas,
        resueltoPor: usuarioId,
        resueltoEn:  new Date(),
      },
      include: {
        variante: {
          include: {
            producto: { select: { id: true, nombre: true } },
            unidad:   { select: { id: true, abreviatura: true } },
          },
        },
      },
    });
  }

  // -------------------------------------------------------------------------
  // Resolución automática: marca como RESUELTO todos los items con diferencia
  // Solo afecta los que están en DIFERENCIA o SIN_CONTRAPARTIDA
  // El frontend advierte al usuario antes de llamar este endpoint
  // -------------------------------------------------------------------------
  async resolverAutoAll(sincronizacionId: number, usuarioId: number, empresaId: number) {
    const sinc = await this.prisma.sincronizacion.findFirst({
      where: { id: sincronizacionId, almacen: { empresaId } },
    });
    if (!sinc) throw new NotFoundException(`Sincronizacion #${sincronizacionId} no encontrada`);

    if (sinc.estado === EstadoSincronizacion.COMPLETADA) {
      throw new BadRequestException('Esta sincronización ya está completamente resuelta');
    }

    const { count } = await this.prisma.reconciliacionItem.updateMany({
      where: {
        sincronizacionId,
        estado: { in: [EstadoReconciliacion.DIFERENCIA, EstadoReconciliacion.SIN_CONTRAPARTIDA, EstadoReconciliacion.PENDIENTE_REVISION] },
      },
      data: {
        estado:      EstadoReconciliacion.RESUELTO,
        resueltoPor: usuarioId,
        resueltoEn:  new Date(),
      },
    });

    // Si ya no quedan pendientes, marcar la sincronización como COMPLETADA
    const pendientes = await this.prisma.reconciliacionItem.count({
      where: {
        sincronizacionId,
        estado: { in: [EstadoReconciliacion.DIFERENCIA, EstadoReconciliacion.SIN_CONTRAPARTIDA, EstadoReconciliacion.PENDIENTE_REVISION] },
      },
    });

    if (pendientes === 0) {
      await this.prisma.sincronizacion.update({
        where: { id: sincronizacionId },
        data:  { estado: EstadoSincronizacion.COMPLETADA },
      });
    }

    return { resueltos: count, pendientes };
  }
}
