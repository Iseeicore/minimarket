import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVarianteDto } from './dto/create-variante.dto';
import { UpdateVarianteDto } from './dto/update-variante.dto';

@Injectable()
export class VariantesService {
  constructor(private readonly prisma: PrismaService) {}

  findByProducto(productoId: number, empresaId: number) {
    return this.prisma.variante.findMany({
      where:   { productoId, producto: { empresaId } },
      include: { unidad: true },
      orderBy: { nombre: 'asc' },
    });
  }

  findAll(empresaId: number, search?: string) {
    return this.prisma.variante.findMany({
      where: {
        activo:   true,
        producto: { empresaId },
        ...(search && {
          OR: [
            { nombre:  { contains: search, mode: 'insensitive' } },
            { sku:     { contains: search, mode: 'insensitive' } },
            { producto: { nombre: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        producto: { select: { id: true, nombre: true } },
        unidad:   { select: { id: true, nombre: true, abreviatura: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const variante = await this.prisma.variante.findFirst({
      where:   { id, producto: { empresaId } },
      include: { producto: true, unidad: true },
    });
    if (!variante) throw new NotFoundException(`Variante #${id} no encontrada`);
    return variante;
  }

  create(dto: CreateVarianteDto) {
    return this.prisma.variante.create({
      data:    dto,
      include: { producto: true, unidad: true },
    });
  }

  async update(id: number, dto: UpdateVarianteDto, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.variante.update({
      where:   { id },
      data:    dto,
      include: { producto: true, unidad: true },
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.variante.update({
      where: { id },
      data:  { activo: false },
    });
  }
}
