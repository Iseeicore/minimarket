import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

const SELECT_USUARIO_AUTH = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  almacenId: true,
  empresaId: true,
  activo: true,
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo)
      throw new UnauthorizedException('Credenciales inválidas');

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido)
      throw new UnauthorizedException('Credenciales inválidas');

    return this.buildAuthResponse(usuario);
  }

  async register(dto: RegisterDto) {
    const emailExiste = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (emailExiste)
      throw new BadRequestException('Ya existe una cuenta con ese email');

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear empresa
      const empresa = await tx.empresa.create({
        data: {
          nombre: dto.nombreEmpresa,
          ruc: dto.ruc,
          direccion: dto.direccionEmpresa,
          telefono: dto.telefonoEmpresa,
        },
      });

      // 2. Crear usuario ADMIN de esa empresa
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const usuario = await tx.usuario.create({
        data: {
          empresaId: empresa.id,
          nombre: dto.nombre,
          email: dto.email,
          passwordHash,
          rol: 'ADMIN',
        },
        select: { ...SELECT_USUARIO_AUTH, empresa: true },
      });

      return {
        ...this.buildAuthResponse(usuario),
        empresa,
      };
    });
  }

  private buildAuthResponse(usuario: any) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empresaId: usuario.empresaId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        almacenId: usuario.almacenId,
        empresaId: usuario.empresaId,
      },
    };
  }
}
