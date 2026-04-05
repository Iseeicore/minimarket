import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCaja, EstadoVenta, TipoDescuento, TipoMovCaja, TipoMovStock } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVentaDto, CreateItemVentaDto } from './dto/create-venta.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/paginate';

const INCLUDE_VENTA = {
  almacen: true,
  caja: true,
  contacto: true,
  creador: { select: { id: true, nombre: true, rol: true } },
  items: { include: { variante: true } },
};

function calcularDescuentoItem(item: CreateItemVentaDto): number {
  if (!item.tipoDescuento || item.tipoDescuento === TipoDescuento.NINGUNO) return 0;
  const valorDescuento = item.valorDescuento ?? 0;
  if (item.tipoDescuento === TipoDescuento.POR_UNIDAD) {
    return valorDescuento * item.cantidad;
  }
  return valorDescuento; // POR_TOTAL
}

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async findAll({ page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.venta.findMany({
        skip,
        take: limit,
        include: INCLUDE_VENTA,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.venta.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async findHoy() {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);

    return this.prisma.venta.findMany({
      where: {
        creadoEn: { gte: inicio, lte: fin },
        estado: EstadoVenta.COMPLETADA,
      },
      include: INCLUDE_VENTA,
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: { ...INCLUDE_VENTA, devoluciones: true },
    });
    if (!venta) throw new NotFoundException(`Venta #${id} no encontrada`);
    return venta;
  }

  async create(dto: CreateVentaDto, usuarioId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar caja abierta
      const caja = await tx.caja.findUnique({ where: { id: dto.cajaId } });
      if (!caja || caja.estado !== EstadoCaja.ABIERTA) {
        throw new BadRequestException('La caja no está abierta');
      }
      if (caja.almacenId !== dto.almacenId) {
        throw new BadRequestException('La caja no pertenece al almacén indicado');
      }

      // 2. Verificar stock y calcular totales
      let subtotal = 0;
      let descuentoTotal = 0;

      const stocksVerificados: Array<{
        varianteId: number;
        cantidadAntes: number;
      }> = [];

      for (const item of dto.items) {
        const stock = await tx.stockAlmacen.findUnique({
          where: {
            almacenId_varianteId: {
              almacenId: dto.almacenId,
              varianteId: item.varianteId,
            },
          },
        });

        if (!stock || stock.cantidad < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para la variante #${item.varianteId}. Disponible: ${stock?.cantidad ?? 0}`,
          );
        }

        stocksVerificados.push({ varianteId: item.varianteId, cantidadAntes: stock.cantidad });

        const bruto = item.cantidad * item.precioUnitario;
        const descuento = calcularDescuentoItem(item);
        subtotal += bruto;
        descuentoTotal += descuento;
      }

      const total = subtotal - descuentoTotal;

      // 3. Crear venta + items
      const venta = await tx.venta.create({
        data: {
          almacenId: dto.almacenId,
          cajaId: dto.cajaId,
          contactoId: dto.contactoId,
          metodoPago: dto.metodoPago,
          estado: EstadoVenta.COMPLETADA,
          subtotal,
          descuentoTotal,
          total,
          creadoPor: usuarioId,
          items: {
            create: dto.items.map((item) => {
              const descuento = calcularDescuentoItem(item);
              return {
                varianteId: item.varianteId,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                tipoDescuento: item.tipoDescuento ?? TipoDescuento.NINGUNO,
                valorDescuento: item.valorDescuento ?? 0,
                subtotal: item.cantidad * item.precioUnitario - descuento,
              };
            }),
          },
        },
        include: INCLUDE_VENTA,
      });

      // 4. Actualizar stock y crear movimientos
      for (const item of dto.items) {
        const verificado = stocksVerificados.find((s) => s.varianteId === item.varianteId)!;

        await tx.stockAlmacen.update({
          where: {
            almacenId_varianteId: {
              almacenId: dto.almacenId,
              varianteId: item.varianteId,
            },
          },
          data: { cantidad: { decrement: item.cantidad } },
        });

        await tx.movimientoStock.create({
          data: {
            almacenId: dto.almacenId,
            varianteId: item.varianteId,
            tipo: TipoMovStock.VENTA_SALIDA,
            referenciaTipo: 'Venta',
            referenciaId: venta.id,
            cantidad: item.cantidad,
            cantidadAntes: verificado.cantidadAntes,
            cantidadDespues: verificado.cantidadAntes - item.cantidad,
            creadoPor: usuarioId,
          },
        });
      }

      // 5. Movimiento de caja
      await tx.movimientoCaja.create({
        data: {
          cajaId: dto.cajaId,
          tipo: TipoMovCaja.INGRESO,
          referenciaTipo: 'Venta',
          referenciaId: venta.id,
          monto: total,
          descripcion: `Venta #${venta.id}`,
        },
      });

      return venta;
    });
  }
}
