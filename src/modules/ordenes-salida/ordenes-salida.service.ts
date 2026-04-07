import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/utils/paginate';
import { CreateOrdenSalidaDto } from './dto/create-orden-salida.dto';
import { FilterOrdenSalidaDto } from './dto/filter-orden-salida.dto';

@Injectable()
export class OrdenesSalidaService {
  constructor(private prisma: PrismaService) {}

  // Standard include for queries
  private readonly include = {
    solicitante: { select: { id: true, nombre: true } },
    detalles: {
      include: {
        variante: {
          include: {
            producto: { select: { id: true, nombre: true } },
            unidad: { select: { id: true, nombre: true, abreviatura: true } },
          },
        },
      },
    },
  } as const;

  async findAll(filters: FilterOrdenSalidaDto, empresaId: number) {
    const { page = 1, limit = 20, almacenId, desde, hasta } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.OrdenSalidaWhereInput = {
      almacen: { empresaId },
      ...(almacenId && { almacenId }),
      ...(desde || hasta
        ? {
            creadoEn: {
              ...(desde && { gte: new Date(`${desde}T00:00:00-05:00`) }),
              ...(hasta && { lte: new Date(`${hasta}T23:59:59.999-05:00`) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.ordenSalida.findMany({
        where,
        skip,
        take: limit,
        include: this.include,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.ordenSalida.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: number, empresaId: number) {
    const orden = await this.prisma.ordenSalida.findFirst({
      where: { id, almacen: { empresaId } },
      include: this.include,
    });
    if (!orden) throw new NotFoundException(`Orden #${id} no encontrada`);
    return orden;
  }

  /**
   * Crear orden de salida y mover stock en una transacción.
   *
   * Pasos atómicos:
   * 1. Obtener siguiente número de orden para el almacén
   * 2. Verificar stock disponible para cada item
   * 3. Crear OrdenSalida + detalles
   * 4. Decrementar StockAlmacen (o StockTienda si origen=TIENDA)
   * 5. Incrementar StockTienda (upsert) — solo si origen=ALMACEN
   * 6. Registrar MovimientoStock por cada item
   * 7. Registrar en RegistroTienda (alimenta el cuadernillo automáticamente)
   */
  async create(dto: CreateOrdenSalidaDto, userId: number, empresaId: number) {
    // Validar que el almacén pertenece a la empresa
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenId, empresaId },
    });
    if (!almacen) throw new NotFoundException('Almacen no encontrado');

    return this.prisma.$transaction(async (tx) => {
      // 1. Siguiente número de orden
      const ultimaOrden = await tx.ordenSalida.findFirst({
        where: { almacenId: dto.almacenId },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      });
      const numero = (ultimaOrden?.numero ?? 0) + 1;

      // 2. Calcular totales
      const totalProductos = dto.items.length;
      const totalUnidades = dto.items.reduce((sum, item) => sum + item.cantidad, 0);

      // 3. Crear la orden con detalles
      const orden = await tx.ordenSalida.create({
        data: {
          numero,
          almacenId: dto.almacenId,
          tipo: dto.tipo,
          estado: 'COMPLETADA', // Se completa al instante — el ticket ya se imprime
          completadoEn: new Date(),
          totalProductos,
          totalUnidades,
          solicitadoPor: userId,
          detalles: {
            create: dto.items.map((item) => ({
              varianteId: item.varianteId,
              cantidad: item.cantidad,
              origen: item.origen,
            })),
          },
        },
        include: this.include,
      });

      // 4-7. Por cada item: verificar stock, mover, registrar
      for (const item of dto.items) {
        if (item.origen === 'ALMACEN') {
          // Verificar stock en almacén
          const stockAlm = await tx.stockAlmacen.findUnique({
            where: {
              almacenId_varianteId: { almacenId: dto.almacenId, varianteId: item.varianteId },
            },
          });
          const disponible = stockAlm?.cantidad ?? 0;
          if (disponible < item.cantidad) {
            throw new BadRequestException(
              `Stock insuficiente en almacen para variante #${item.varianteId}: disponible ${disponible}, solicitado ${item.cantidad}`,
            );
          }

          // Decrementar stock almacén
          await tx.stockAlmacen.update({
            where: {
              almacenId_varianteId: { almacenId: dto.almacenId, varianteId: item.varianteId },
            },
            data: { cantidad: { decrement: item.cantidad } },
          });

          // Registrar movimiento stock (salida de almacén)
          await tx.movimientoStock.create({
            data: {
              almacenId: dto.almacenId,
              varianteId: item.varianteId,
              tipo: 'ORDEN_SALIDA',
              referenciaTipo: 'ORDEN_SALIDA',
              referenciaId: orden.id,
              cantidad: -item.cantidad,
              cantidadAntes: disponible,
              cantidadDespues: disponible - item.cantidad,
              creadoPor: userId,
            },
          });

          // Incrementar stock tienda (upsert)
          await tx.stockTienda.upsert({
            where: {
              almacenId_varianteId: { almacenId: dto.almacenId, varianteId: item.varianteId },
            },
            create: { almacenId: dto.almacenId, varianteId: item.varianteId, cantidad: item.cantidad },
            update: { cantidad: { increment: item.cantidad } },
          });
        } else {
          // origen === 'TIENDA' — descontar de stock tienda directamente
          const stockTie = await tx.stockTienda.findUnique({
            where: {
              almacenId_varianteId: { almacenId: dto.almacenId, varianteId: item.varianteId },
            },
          });
          const disponible = stockTie?.cantidad ?? 0;
          if (disponible < item.cantidad) {
            throw new BadRequestException(
              `Stock insuficiente en tienda para variante #${item.varianteId}: disponible ${disponible}, solicitado ${item.cantidad}`,
            );
          }

          await tx.stockTienda.update({
            where: {
              almacenId_varianteId: { almacenId: dto.almacenId, varianteId: item.varianteId },
            },
            data: { cantidad: { decrement: item.cantidad } },
          });
        }

        // Registrar en cuadernillo de tienda (alimenta TiendaCuadernoPage automáticamente)
        const tipoRegistro = dto.tipo === 'VENTA' ? 'SALIDA' : 'TRANSFERENCIA';
        await tx.registroTienda.create({
          data: {
            almacenId: dto.almacenId,
            varianteId: item.varianteId,
            cantidad: item.cantidad,
            tipo: tipoRegistro,
            notas: `Orden #${numero} - ${dto.tipo}`,
            creadoPor: userId,
          },
        });
      }

      return orden;
    });
  }

  async completar(id: number, empresaId: number) {
    const orden = await this.findOne(id, empresaId);
    if (orden.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden completar ordenes pendientes');
    }
    return this.prisma.ordenSalida.update({
      where: { id },
      data: { estado: 'COMPLETADA', completadoEn: new Date() },
      include: this.include,
    });
  }

  async cancelar(id: number, empresaId: number) {
    const orden = await this.findOne(id, empresaId);
    if (orden.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se pueden cancelar ordenes pendientes');
    }
    return this.prisma.ordenSalida.update({
      where: { id },
      data: { estado: 'CANCELADA' },
      include: this.include,
    });
  }
}
