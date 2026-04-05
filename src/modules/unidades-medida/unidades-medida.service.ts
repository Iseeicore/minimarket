import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';

@Injectable()
export class UnidadesMedidaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.unidadMedida.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: number) {
    const unidad = await this.prisma.unidadMedida.findUnique({ where: { id } });
    if (!unidad) throw new NotFoundException(`Unidad de medida #${id} no encontrada`);
    return unidad;
  }

  create(dto: CreateUnidadMedidaDto) {
    return this.prisma.unidadMedida.create({ data: dto });
  }

  async update(id: number, dto: UpdateUnidadMedidaDto) {
    await this.findOne(id);
    return this.prisma.unidadMedida.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.unidadMedida.delete({ where: { id } });
  }
}
