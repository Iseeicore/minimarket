import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBitacoraDto } from './dto/create-bitacora.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/paginate';

@Injectable()
export class BitacoraService {
  constructor(private prisma: PrismaService) {}

  async findAll({ page = 1, limit = 20 }: PaginationDto, empresaId: number, almacenId?: number) {
    const skip  = (page - 1) * limit;
    const where = {
      almacen: { empresaId },
      ...(almacenId && { almacenId }),
    };
    const include = {
      almacen: { select: { id: true, nombre: true } },
      usuario: { select: { id: true, nombre: true, rol: true } },
    };
    const [data, total] = await Promise.all([
      this.prisma.bitacora.findMany({ where, skip, take: limit, include, orderBy: { registradoEn: 'desc' } }),
      this.prisma.bitacora.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  create(dto: CreateBitacoraDto, usuarioId: number) {
    return this.prisma.bitacora.create({
      data:    { almacenId: dto.almacenId, usuarioId, contenido: dto.contenido },
      include: {
        almacen: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, rol: true } },
      },
    });
  }
}
