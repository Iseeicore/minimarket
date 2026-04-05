import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCompra, TipoMovStock } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { CreatePagoCompraDto } from './dto/create-pago-compra.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/paginate';

const INCLUDE_ORDEN = {
  almacen: true,
  contacto: true,
  items: { include: { variante: true } },
  pagos: true,
};

@Injectable()
export class ComprasService {
  constructor(private prisma: PrismaService) {}

  async findAll({ page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.ordenCompra.findMany({
        skip,
        take: limit,
        include: INCLUDE_ORDEN,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.ordenCompra.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: number) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: INCLUDE_ORDEN,
    });
    if (!orden) throw new NotFoundException(`Orden de compra #${id} no encontrada`);
    return orden;
  }

  async create(dto: CreateOrdenCompraDto) {
    const total = dto.items.reduce(
      (acc, item) => acc + item.cantidad * item.costoUnitario,
      0,
    );

    return this.prisma.ordenCompra.create({
      data: {
        almacenId: dto.almacenId,
        contactoId: dto.contactoId,
        notas: dto.notas,
        total,
        items: {
          create: dto.items.map((item) => ({
            varianteId: item.varianteId,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            subtotal: item.cantidad * item.costoUnitario,
          })),
        },
      },
      include: INCLUDE_ORDEN,
    });
  }

  async recibirOrden(id: number, usuarioId: number) {
    const orden = await this.findOne(id);

    if (orden.recibidoEn) {
      throw new BadRequestException('Esta orden ya fue recibida');
    }

    return this.prisma.$transaction(async (tx) => {
      const ordenActualizada = await tx.ordenCompra.update({
        where: { id },
        data: { recibidoEn: new Date() },
        include: INCLUDE_ORDEN,
      });

      for (const item of orden.items) {
        const stockExistente = await tx.stockAlmacen.findUnique({
          where: {
            almacenId_varianteId: {
              almacenId: orden.almacenId,
              varianteId: item.varianteId,
            },
          },
        });

        const cantidadAntes = stockExistente?.cantidad ?? 0;

        await tx.stockAlmacen.upsert({
          where: {
            almacenId_varianteId: {
              almacenId: orden.almacenId,
              varianteId: item.varianteId,
            },
          },
          create: {
            almacenId: orden.almacenId,
            varianteId: item.varianteId,
            cantidad: item.cantidad,
          },
          update: { cantidad: { increment: item.cantidad } },
        });

        await tx.movimientoStock.create({
          data: {
            almacenId: orden.almacenId,
            varianteId: item.varianteId,
            tipo: TipoMovStock.COMPRA_ENTRADA,
            referenciaTipo: 'OrdenCompra',
            referenciaId: orden.id,
            cantidad: item.cantidad,
            cantidadAntes,
            cantidadDespues: cantidadAntes + item.cantidad,
            creadoPor: usuarioId,
          },
        });
      }

      return ordenActualizada;
    });
  }

  async registrarPago(id: number, dto: CreatePagoCompraDto) {
    const orden = await this.findOne(id);

    await this.prisma.pagoCompra.create({
      data: {
        ordenCompraId: id,
        monto: dto.monto,
        notas: dto.notas,
      },
    });

    const pagos = await this.prisma.pagoCompra.aggregate({
      where: { ordenCompraId: id },
      _sum: { monto: true },
    });

    const totalPagado = Number(pagos._sum.monto ?? 0);
    const totalOrden = Number(orden.total);

    const nuevoEstado: EstadoCompra =
      totalPagado >= totalOrden ? EstadoCompra.PAGADO : EstadoCompra.PARCIAL;

    return this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: nuevoEstado },
      include: INCLUDE_ORDEN,
    });
  }

  async remove(id: number) {
    const orden = await this.findOne(id);
    if (orden.recibidoEn) {
      throw new BadRequestException(
        'No se puede eliminar una orden ya recibida',
      );
    }
    await this.prisma.itemCompra.deleteMany({ where: { ordenCompraId: id } });
    return this.prisma.ordenCompra.delete({ where: { id } });
  }
}
