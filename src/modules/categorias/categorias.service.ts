import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: number) {
    return this.prisma.categoria.findMany({
      where:   { empresaId },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const categoria = await this.prisma.categoria.findFirst({
      where: { id, empresaId },
    });
    if (!categoria) throw new NotFoundException(`Categoría #${id} no encontrada`);
    return categoria;
  }

  create(dto: CreateCategoriaDto, empresaId: number) {
    return this.prisma.categoria.create({ data: { ...dto, empresaId } });
  }

  async update(id: number, dto: UpdateCategoriaDto, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.categoria.update({ where: { id }, data: dto });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.categoria.delete({ where: { id } });
  }
}
