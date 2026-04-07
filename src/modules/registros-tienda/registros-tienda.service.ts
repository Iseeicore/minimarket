import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/utils/paginate';
import { CreateRegistroTiendaDto } from './dto/create-registro-tienda.dto';
import { FilterRegistroTiendaDto } from './dto/filter-registro-tienda.dto';

const INCLUDE_REGISTRO = {
  almacen:  { select: { id: true, nombre: true } },
  variante: {
    include: {
      producto: { select: { id: true, nombre: true } },
      unidad:   { select: { id: true, abreviatura: true } },
    },
  },
  usuario: { select: { id: true, nombre: true, rol: true } },
} satisfies Prisma.RegistroTiendaInclude;

@Injectable()
export class RegistrosTiendaService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: FilterRegistroTiendaDto, empresaId: number) {
    const { page = 1, limit = 20, almacenId, tipo, desde, hasta } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.RegistroTiendaWhereInput = {
      almacen:  { empresaId },
      devuelto: false,
      ...(almacenId && { almacenId }),
      ...(tipo      && { tipo }),
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
      this.prisma.registroTienda.findMany({
        where,
        skip,
        take:    limit,
        include: INCLUDE_REGISTRO,
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.registroTienda.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: number, empresaId: number) {
    const registro = await this.prisma.registroTienda.findFirst({
      where:   { id, almacen: { empresaId } },
      include: INCLUDE_REGISTRO,
    });
    if (!registro) throw new NotFoundException(`RegistroTienda #${id} no encontrado`);
    return registro;
  }

  async conteoPorDia(almacenId: number, desde: string, hasta: string, empresaId: number) {
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: almacenId, empresaId },
    });
    if (!almacen) throw new NotFoundException(`Almacen #${almacenId} no encontrado`);

    const registros = await this.prisma.registroTienda.findMany({
      where: {
        almacenId,
        devuelto: false,
        creadoEn: {
          gte: new Date(`${desde}T00:00:00-05:00`),
          lte: new Date(`${hasta}T23:59:59.999-05:00`),
        },
      },
      select: { creadoEn: true },
    });

    // Agrupar por fecha local Lima (UTC-5)
    const conteo: Record<string, number> = {};
    for (const r of registros) {
      const fecha = new Date(r.creadoEn.getTime() - 5 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      conteo[fecha] = (conteo[fecha] ?? 0) + 1;
    }

    return conteo;
  }

  /**
   * Resumen consolidado por producto: agrupa registros por varianteId+tipo,
   * suma cantidades. Para el slide del cuaderno.
   */
  async resumenDia(
    almacenId: number,
    fecha: string,
    empresaId: number,
    tipo?: string,
    page = 1,
    limit = 10,
  ) {
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: almacenId, empresaId },
    });
    if (!almacen) throw new NotFoundException(`Almacen #${almacenId} no encontrado`);

    const desde = new Date(`${fecha}T00:00:00-05:00`);
    const hasta = new Date(`${fecha}T23:59:59.999-05:00`);

    const where: Prisma.RegistroTiendaWhereInput = {
      almacenId,
      devuelto: false,
      creadoEn: { gte: desde, lte: hasta },
      ...(tipo && { tipo: tipo as any }),
    };

    // Agrupar por varianteId, sumar cantidad
    const grupos = await this.prisma.registroTienda.groupBy({
      by: ['varianteId'],
      where,
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: 'desc' } },
    });

    const total = grupos.length;
    const skip = (page - 1) * limit;
    const paginado = grupos.slice(skip, skip + limit);

    // Enriquecer con datos de variante + producto
    const varianteIds = paginado.map((g) => g.varianteId);
    const variantes = await this.prisma.variante.findMany({
      where: { id: { in: varianteIds } },
      include: {
        producto: { select: { id: true, nombre: true } },
        unidad: { select: { id: true, abreviatura: true } },
      },
    });
    const mapaVar = new Map(variantes.map((v) => [v.id, v]));

    const data = paginado.map((g) => ({
      varianteId: g.varianteId,
      totalCantidad: g._sum.cantidad ?? 0,
      variante: mapaVar.get(g.varianteId),
    }));

    return paginate(data, total, page, limit);
  }

  async create(dto: CreateRegistroTiendaDto, usuarioId: number, empresaId: number) {
    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenId, empresaId },
    });
    if (!almacen) throw new NotFoundException(`Almacen #${dto.almacenId} no encontrado`);

    const variante = await this.prisma.variante.findFirst({
      where: { id: dto.varianteId, activo: true },
    });
    if (!variante) throw new NotFoundException(`Variante #${dto.varianteId} no encontrada`);

    return this.prisma.registroTienda.create({
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
  }

  // Marca el registro como devuelto — lo excluye del listado activo y de la sincronización
  async marcarDevuelto(id: number, usuarioId: number, empresaId: number) {
    const registro = await this.prisma.registroTienda.findFirst({
      where: { id, almacen: { empresaId } },
    });
    if (!registro) throw new NotFoundException(`RegistroTienda #${id} no encontrado`);
    if (registro.devuelto) {
      throw new BadRequestException('Este registro ya fue marcado como devuelto');
    }

    return this.prisma.registroTienda.update({
      where:   { id },
      data:    { devuelto: true, notas: registro.notas ? `${registro.notas} | Devuelto por usuario #${usuarioId}` : `Devuelto por usuario #${usuarioId}` },
      include: INCLUDE_REGISTRO,
    });
  }
}
