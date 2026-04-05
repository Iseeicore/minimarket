import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/paginate';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.stockAlmacen.findMany({
      include: {
        almacen: true,
        variante: { include: { producto: true, unidad: true } },
      },
      orderBy: { almacenId: 'asc' },
    });
  }

  async findOne(id: number) {
    const stock = await this.prisma.stockAlmacen.findUnique({
      where: { id },
      include: {
        almacen: true,
        variante: { include: { producto: true, unidad: true } },
      },
    });
    if (!stock) throw new NotFoundException(`Stock #${id} no encontrado`);
    return stock;
  }

  findByAlmacen(almacenId: number) {
    return this.prisma.stockAlmacen.findMany({
      where: { almacenId },
      include: {
        variante: { include: { producto: true, unidad: true } },
      },
      orderBy: { variante: { nombre: 'asc' } },
    });
  }

  async findMovimientos({ page = 1, limit = 20 }: PaginationDto, almacenId?: number) {
    const skip  = (page - 1) * limit;
    const where = almacenId ? { almacenId } : undefined;
    const [data, total] = await Promise.all([
      this.prisma.movimientoStock.findMany({
        where,
        skip,
        take: limit,
        include: {
          almacen: true,
          variante: { include: { producto: true } },
          usuario: { select: { id: true, nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
      }),
      this.prisma.movimientoStock.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }
}
