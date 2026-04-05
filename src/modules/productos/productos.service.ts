import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.producto.findMany({
      include: {
        categoria: { select: { id: true, nombre: true } },
        variantes: {
          where: { activo: true },
          include: { unidad: { select: { id: true, nombre: true, abreviatura: true } } },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        variantes: {
          include: { unidad: true },
        },
      },
    });
    if (!producto) throw new NotFoundException(`Producto #${id} no encontrado`);
    return producto;
  }

  create(dto: CreateProductoDto) {
    return this.prisma.producto.create({
      data: dto,
      include: { categoria: true },
    });
  }

  async update(id: number, dto: UpdateProductoDto) {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: dto,
      include: { categoria: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.producto.delete({ where: { id } });
  }
}
