import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const SELECT_USUARIO = {
  id: true,
  empresaId: true,
  almacenId: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  passwordHash: false,
  empresa: { select: { id: true, nombre: true } },
  almacen: { select: { id: true, nombre: true } },
};

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  findAll(empresaId: number) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      select: SELECT_USUARIO,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      select: SELECT_USUARIO,
    });
    if (!usuario) throw new NotFoundException(`Usuario #${id} no encontrado`);
    return usuario;
  }

  async create(dto: CreateUsuarioDto, empresaId: number) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existe) throw new BadRequestException('Ya existe un usuario con ese email');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.usuario.create({
      data: {
        empresaId,
        almacenId: dto.almacenId,
        nombre: dto.nombre,
        email: dto.email,
        passwordHash,
        rol: dto.rol,
      },
      select: SELECT_USUARIO,
    });
  }

  async update(id: number, dto: UpdateUsuarioDto, empresaId: number) {
    await this.findOne(id, empresaId);

    const data: Record<string, unknown> = {
      nombre: dto.nombre,
      rol: dto.rol,
      almacenId: dto.almacenId,
      activo: dto.activo,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    // Eliminar undefined para no sobreescribir con null
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: SELECT_USUARIO,
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: SELECT_USUARIO,
    });
  }
}
