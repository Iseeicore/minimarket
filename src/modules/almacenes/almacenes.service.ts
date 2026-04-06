import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { UpdateAlmacenDto } from './dto/update-almacen.dto';

@Injectable()
export class AlmacenesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: number) {
    return this.prisma.almacen.findMany({
      where:   { empresaId },
      include: { empresa: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const almacen = await this.prisma.almacen.findFirst({
      where:   { id, empresaId },
      include: { empresa: { select: { nombre: true } } },
    });
    if (!almacen) throw new NotFoundException(`Almacén #${id} no encontrado`);
    return almacen;
  }

  create(dto: CreateAlmacenDto, empresaId: number) {
    return this.prisma.almacen.create({ data: { ...dto, empresaId } });
  }

  async update(id: number, dto: UpdateAlmacenDto, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.almacen.update({ where: { id }, data: dto });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.almacen.delete({ where: { id } });
  }
}
