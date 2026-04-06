import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoVenta, TipoDescuento, TipoMovCaja, TipoMovRegistro, TipoMovStock } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/paginate';

const INCLUDE_DEVOLUCION = {
  venta:   true,
  usuario: { select: { id: true, nombre: true, rol: true } },
  items:   { include: { itemVenta: { include: { variante: true } } } },
};

@Injectable()
export class DevolucionesService {
  constructor(private prisma: PrismaService) {}

  async findAll({ page = 1, limit = 20 }: PaginationDto, empresaId: number) {
    const skip  = (page - 1) * limit;
    const where = { venta: { almacen: { empresaId } } };
    const [data, total] = await Promise.all([
      this.prisma.devolucion.findMany({
        where,
        skip,
        take:    limit,
        include: INCLUDE_DEVOLUCION,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.devolucion.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: number, empresaId: number) {
    const dev = await this.prisma.devolucion.findFirst({
      where:   { id, venta: { almacen: { empresaId } } },
      include: INCLUDE_DEVOLUCION,
    });
    if (!dev) throw new NotFoundException(`Devolución #${id} no encontrada`);
    return dev;
  }

  async create(dto: CreateDevolucionDto, usuarioId: number, empresaId: number) {
    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findFirst({
        where: { id: dto.ventaId, almacen: { empresaId } },
        include: {
          items: { include: { variante: true, itemsDevolucion: true } },
          caja:  true,
        },
      });

      if (!venta) throw new NotFoundException(`Venta #${dto.ventaId} no encontrada`);
      if (venta.estado === EstadoVenta.CANCELADA) {
        throw new BadRequestException('No se puede devolver una venta cancelada');
      }

      for (const itemDev of dto.items) {
        const itemVenta = venta.items.find((i) => i.id === itemDev.itemVentaId);
        if (!itemVenta) throw new NotFoundException(`Item de venta #${itemDev.itemVentaId} no encontrado`);

        const yaDevuelto        = itemVenta.itemsDevolucion.reduce((acc, d) => acc + d.cantidadDevuelta, 0);
        const disponibleDevolver = itemVenta.cantidad - yaDevuelto;

        if (itemDev.cantidadDevuelta > disponibleDevolver) {
          throw new BadRequestException(
            `No se puede devolver ${itemDev.cantidadDevuelta} unidades del item #${itemDev.itemVentaId}. Máximo disponible: ${disponibleDevolver}`,
          );
        }
      }

      const devolucion = await tx.devolucion.create({
        data: {
          ventaId:      dto.ventaId,
          procesadoPor: usuarioId,
          motivo:       dto.motivo,
          notas:        dto.notas,
          items: {
            create: dto.items.map((item) => ({
              itemVentaId:      item.itemVentaId,
              cantidadDevuelta: item.cantidadDevuelta,
              tipoDescuento:    item.tipoDescuento ?? TipoDescuento.NINGUNO,
              valorDescuento:   item.valorDescuento ?? 0,
              montoDevuelto:    item.montoDevuelto,
            })),
          },
        },
        include: INCLUDE_DEVOLUCION,
      });

      for (const itemDev of dto.items) {
        const itemVenta   = venta.items.find((i) => i.id === itemDev.itemVentaId)!;
        const stockActual = await tx.stockAlmacen.findUnique({
          where: { almacenId_varianteId: { almacenId: venta.almacenId, varianteId: itemVenta.varianteId } },
        });
        const cantidadAntes = stockActual?.cantidad ?? 0;

        await tx.stockAlmacen.upsert({
          where:  { almacenId_varianteId: { almacenId: venta.almacenId, varianteId: itemVenta.varianteId } },
          create: { almacenId: venta.almacenId, varianteId: itemVenta.varianteId, cantidad: itemDev.cantidadDevuelta },
          update: { cantidad: { increment: itemDev.cantidadDevuelta } },
        });

        await tx.movimientoStock.create({
          data: {
            almacenId:       venta.almacenId,
            varianteId:      itemVenta.varianteId,
            tipo:            TipoMovStock.DEVOLUCION_ENTRADA,
            referenciaTipo:  'Devolucion',
            referenciaId:    devolucion.id,
            cantidad:        itemDev.cantidadDevuelta,
            cantidadAntes,
            cantidadDespues: cantidadAntes + itemDev.cantidadDevuelta,
            creadoPor:       usuarioId,
          },
        });
      }

      const totalDevuelto = dto.items.reduce((acc, i) => acc + i.montoDevuelto, 0);
      await tx.movimientoCaja.create({
        data: {
          cajaId:         venta.cajaId,
          tipo:           TipoMovCaja.EGRESO,
          referenciaTipo: 'Devolucion',
          referenciaId:   devolucion.id,
          monto:          totalDevuelto,
          descripcion:    `Devolución venta #${venta.id}`,
        },
      });

      const todosLosItems = await tx.itemVenta.findMany({
        where:   { ventaId: dto.ventaId },
        include: { itemsDevolucion: true },
      });
      const todosDevueltos = todosLosItems.every((item) => {
        const total = item.itemsDevolucion.reduce((acc, d) => acc + d.cantidadDevuelta, 0);
        return total >= item.cantidad;
      });
      if (todosDevueltos) {
        await tx.venta.update({ where: { id: dto.ventaId }, data: { estado: EstadoVenta.DEVUELTA } });
      }

      // Registrar cada ítem devuelto en ambos cuadernos (almacén y tienda)
      // El cuaderno de tienda se actualiza automáticamente para que el JEFE_VENTA
      // vea la devolución y la sincronización cuadre sin intervención manual.
      await Promise.all(
        dto.items.flatMap((itemDev) => {
          const itemVenta = venta.items.find((i) => i.id === itemDev.itemVentaId)!;
          const notaBase  = `Devolución #${devolucion.id} — venta #${venta.id}`;
          return [
            tx.registroAlmacen.create({
              data: {
                almacenId:  venta.almacenId,
                varianteId: itemVenta.varianteId,
                cantidad:   itemDev.cantidadDevuelta,
                tipo:       TipoMovRegistro.DEVOLUCION,
                ventaId:    venta.id,
                notas:      notaBase,
                creadoPor:  usuarioId,
              },
            }),
            tx.registroTienda.create({
              data: {
                almacenId:  venta.almacenId,
                varianteId: itemVenta.varianteId,
                cantidad:   itemDev.cantidadDevuelta,
                tipo:       TipoMovRegistro.DEVOLUCION,
                notas:      notaBase,
                creadoPor:  usuarioId,
              },
            }),
          ];
        }),
      );

      return devolucion;
    });
  }
}
