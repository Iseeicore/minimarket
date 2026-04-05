import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';

@Injectable()
export class AlmacenesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.almacen.findMany({
      include: { empresa: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const almacen = await this.prisma.almacen.findUnique({
      where: { id },
      include: { empresa: { select: { nombre: true } } },
    });
    if (!almacen) throw new NotFoundException(`Almacén #${id} no encontrado`);
    return almacen;
  }

  create(dto: CreateAlmacenDto) {
    return this.prisma.almacen.create({ data: dto });
  }

  async update(id: number, dto: UpdateAlmacenDto) {
    await this.findOne(id);
    return this.prisma.almacen.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.almacen.delete({ where: { id } });
  }
}
