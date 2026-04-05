import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@Injectable()
export class ContactosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tipo?: string) {
    return this.prisma.contacto.findMany({
      where: tipo ? { tipo: tipo as any } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const contacto = await this.prisma.contacto.findUnique({ where: { id } });
    if (!contacto) throw new NotFoundException(`Contacto #${id} no encontrado`);
    return contacto;
  }

  create(dto: CreateContactoDto) {
    return this.prisma.contacto.create({ data: dto });
  }

  async update(id: number, dto: UpdateContactoDto) {
    await this.findOne(id);
    return this.prisma.contacto.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.contacto.delete({ where: { id } });
  }
}
