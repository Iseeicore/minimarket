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
              ...(desde && { gte: new Date(desde) }),
              ...(hasta && { lte: new Date(hasta) }),
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
