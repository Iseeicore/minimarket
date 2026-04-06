import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@Injectable()
export class ContactosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(empresaId: number, tipo?: string) {
    return this.prisma.contacto.findMany({
      where:   { empresaId, ...(tipo && { tipo: tipo as any }) },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const contacto = await this.prisma.contacto.findFirst({
      where: { id, empresaId },
    });
    if (!contacto) throw new NotFoundException(`Contacto #${id} no encontrado`);
    return contacto;
  }

  create(dto: CreateContactoDto, empresaId: number) {
    return this.prisma.contacto.create({ data: { ...dto, empresaId } });
  }

  async update(id: number, dto: UpdateContactoDto, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.contacto.update({ where: { id }, data: dto });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.contacto.delete({ where: { id } });
  }
}
