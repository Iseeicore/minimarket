import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoCaja,
  EstadoVenta,
  Prisma,
  RolUsuario,
  TipoComprobante,
  TipoDescuento,
  TipoMovCaja,
  TipoMovStock,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrosAlmacenService } from '../registros-almacen/registros-almacen.service';
import { CreateVentaDto, CreateItemVentaDto } from './dto/create-venta.dto';
import { FilterVentaDto } from './dto/filter-venta.dto';
import { paginate } from '../../common/utils/paginate';

// IGV Perú — 18 %
// Los precios se ingresan con IGV incluido (precio de venta al público).
// Para BOLETA/FACTURA extraemos el componente del IGV sin modificar el total.
const IGV_RATE = 0.18;

const INCLUDE_VENTA = {
  almacen:  { select: { id: true, nombre: true } },
  caja:     { select: { id: true } },
  contacto: { select: { id: true, nombre: true, nroDoc: true } },
  creador:  { select: { id: true, nombre: true, rol: true } },
  items:    { include: { variante: { include: { producto: { select: { id: true, nombre: true } } } } } },
} satisfies Prisma.VentaInclude;

function calcularDescuentoItem(item: CreateItemVentaDto): number {
  if (!item.tipoDescuento || item.tipoDescuento === TipoDescuento.NINGUNO) return 0;
  const v = item.valorDescuento ?? 0;
  return item.tipoDescuento === TipoDescuento.POR_UNIDAD ? v * item.cantidad : v;
}

@Injectable()
export class VentasService {
  constructor(
    private prisma: PrismaService,
    private registrosAlmacenService: RegistrosAlmacenService,
  ) {}

  async findAll(filters: FilterVentaDto, empresaId: number) {
    const { page = 1, limit = 20, almacenId, estado, metodoPago, tipoComprobante, desde, hasta } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.VentaWhereInput = {
      almacen: { empresaId },
      ...(almacenId        && { almacenId }),
      ...(estado           && { estado }),
      ...(metodoPago       && { metodoPago }),
      ...(tipoComprobante  && { tipoComprobante }),
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
      this.prisma.venta.findMany({
        where,
        skip,
        take: limit,
        include: INCLUDE_VENTA,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.venta.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findHoy(empresaId: number) {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);

    return this.prisma.venta.findMany({
      where: {
        almacen: { empresaId },
        creadoEn: { gte: inicio, lte: fin },
        estado:   EstadoVenta.COMPLETADA,
      },
      include: INCLUDE_VENTA,
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const venta = await this.prisma.venta.findFirst({
      where: { id, almacen: { empresaId } },
      include: { ...INCLUDE_VENTA, devoluciones: true },
    });
    if (!venta) throw new NotFoundException(`Venta #${id} no encontrada`);
    return venta;
  }

  async create(dto: CreateVentaDto, usuarioId: number, empresaId: number, usuarioRol?: RolUsuario) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar caja abierta y que pertenezca al almacén correcto
      const caja = await tx.caja.findUnique({ where: { id: dto.cajaId } });
      if (!caja || caja.estado !== EstadoCaja.ABIERTA) {
        throw new BadRequestException('La caja no está abierta');
      }
      if (caja.almacenId !== dto.almacenId) {
        throw new BadRequestException('La caja no pertenece al almacén indicado');
      }

      // 2. Verificar que el almacén pertenece a la empresa del usuario
      const almacen = await tx.almacen.findFirst({
        where: { id: dto.almacenId, empresaId },
      });
      if (!almacen) throw new NotFoundException(`Almacen #${dto.almacenId} no encontrado`);

      // 3. Verificar stock y calcular totales
      let subtotal      = 0;
      let descuentoTotal = 0;

      const stocksVerificados: Array<{ varianteId: number; cantidadAntes: number }> = [];

      for (const item of dto.items) {
        const stock = await tx.stockAlmacen.findUnique({
          where: { almacenId_varianteId: { almacenId: dto.almacenId, varianteId: item.varianteId } },
        });

        if (!stock || stock.cantidad < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para la variante #${item.varianteId}. Disponible: ${stock?.cantidad ?? 0}`,
          );
        }

        stocksVerificados.push({ varianteId: item.varianteId, cantidadAntes: stock.cantidad });
        subtotal       += item.cantidad * item.precioUnitario;
        descuentoTotal += calcularDescuentoItem(item);
      }

      const neto = subtotal - descuentoTotal;

      // IGV: precios incluyen IGV — para BOLETA/FACTURA se extrae el componente
      const tipoComprobante = dto.tipoComprobante ?? TipoComprobante.TICKET;
      const igv = tipoComprobante !== TipoComprobante.TICKET
        ? parseFloat((neto - neto / (1 + IGV_RATE)).toFixed(2))
        : 0;

      const total = neto; // total no cambia — IGV ya estaba incluido en el precio

      // 4. Crear venta + items
      const venta = await tx.venta.create({
        data: {
          almacenId:      dto.almacenId,
          cajaId:         dto.cajaId,
          contactoId:     dto.contactoId,
          metodoPago:     dto.metodoPago,
          estado:         EstadoVenta.COMPLETADA,
          subtotal,
          descuentoTotal,
          igv,
          total,
          tipoComprobante,
          serie:          dto.serie,
          nroComprobante: dto.nroComprobante,
          notas:          dto.notas,
          creadoPor:      usuarioId,
          items: {
            create: dto.items.map((item) => {
              const descuento = calcularDescuentoItem(item);
              return {
                varianteId:     item.varianteId,
                cantidad:       item.cantidad,
                precioUnitario: item.precioUnitario,
                tipoDescuento:  item.tipoDescuento ?? TipoDescuento.NINGUNO,
                valorDescuento: item.valorDescuento ?? 0,
                subtotal:       item.cantidad * item.precioUnitario - descuento,
              };
            }),
          },
        },
        include: INCLUDE_VENTA,
      });

      // 5. Actualizar stock y crear movimientos
      for (const item of dto.items) {
        const verificado = stocksVerificados.find((s) => s.varianteId === item.varianteId)!;

        await tx.stockAlmacen.update({
          where: { almacenId_varianteId: { almacenId: dto.almacenId, varianteId: item.varianteId } },
          data:  { cantidad: { decrement: item.cantidad } },
        });

        await tx.movimientoStock.create({
          data: {
            almacenId:       dto.almacenId,
            varianteId:      item.varianteId,
            tipo:            TipoMovStock.VENTA_SALIDA,
            referenciaTipo:  'Venta',
            referenciaId:    venta.id,
            cantidad:        item.cantidad,
            cantidadAntes:   verificado.cantidadAntes,
            cantidadDespues: verificado.cantidadAntes - item.cantidad,
            creadoPor:       usuarioId,
          },
        });
      }

      // 6. Movimiento de caja
      await tx.movimientoCaja.create({
        data: {
          cajaId:         dto.cajaId,
          tipo:           TipoMovCaja.INGRESO,
          referenciaTipo: 'Venta',
          referenciaId:   venta.id,
          monto:          total,
          descripcion:    `Venta #${venta.id}`,
        },
      });

      // 7. Si es JEFE_ALMACEN → registrar salidas en el cuaderno de almacén
      if (usuarioRol === RolUsuario.JEFE_ALMACEN) {
        await this.registrosAlmacenService.createDesdeVenta(
          tx,
          dto.items.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad })),
          dto.almacenId,
          usuarioId,
          venta.id,
        );
      }

      return venta;
    });
  }
}
