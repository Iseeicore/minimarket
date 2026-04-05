import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ---------------------------------------------------------------------------
// Datos mock — sin acentos ni caracteres especiales
// ---------------------------------------------------------------------------
const MOCK_EMPRESA = {
  id: 1,
  nombre: 'Empresa Test SA',
  ruc: '20123456789',
  direccion: 'Av Principal 100',
  telefono: '999000111',
  logoUrl: null,
  creadoEn: new Date('2026-01-01T00:00:00.000Z'),
};

const MOCK_USUARIO = {
  id: 1,
  empresaId: 1,
  almacenId: null,
  nombre: 'Admin Test',
  email: 'admin@test.com',
  passwordHash: '$2b$10$fakehashedpassword',
  rol: 'ADMIN',
  activo: true,
  creadoEn: new Date('2026-01-01T00:00:00.000Z'),
};

const MOCK_USUARIO_SELECT = {
  id: 1,
  nombre: 'Admin Test',
  email: 'admin@test.com',
  rol: 'ADMIN',
  almacenId: null,
  empresaId: 1,
};

// ---------------------------------------------------------------------------
// Mock de PrismaService
// ---------------------------------------------------------------------------
const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  empresa: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ---------------------------------------------------------------------------
// Mock de JwtService
// ---------------------------------------------------------------------------
const mockJwtService = {
  sign: jest.fn().mockReturnValue('fake.jwt.token'),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('fake.jwt.token');
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  describe('login', () => {
    it('retorna token y datos del usuario cuando las credenciales son correctas', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(MOCK_USUARIO);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login('admin@test.com', 'password123');

      expect(result.access_token).toBe('fake.jwt.token');
      expect(result.usuario.email).toBe('admin@test.com');
      expect(result.usuario.rol).toBe('ADMIN');
      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@test.com' },
      });
    });

    it('lanza UnauthorizedException cuando el usuario no existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.login('noexiste@test.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException cuando el usuario esta inactivo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...MOCK_USUARIO,
        activo: false,
      });

      await expect(service.login('admin@test.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException cuando la contrasena es incorrecta', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(MOCK_USUARIO);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login('admin@test.com', 'wrongpass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  describe('register', () => {
    const registerDto = {
      nombre: 'Admin Test',
      email: 'nuevo@test.com',
      password: 'password123',
      nombreEmpresa: 'Mi Empresa',
      ruc: '20999888777',
      direccionEmpresa: 'Calle Test 50',
      telefonoEmpresa: '987654321',
    };

    it('crea empresa y usuario ADMIN, retorna token + empresa', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('$2b$10$hashedpwd' as never);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      mockPrisma.empresa.create.mockResolvedValue(MOCK_EMPRESA);
      mockPrisma.usuario.create.mockResolvedValue({
        ...MOCK_USUARIO_SELECT,
        empresa: { id: 1, nombre: 'Mi Empresa' },
      });

      const result = await service.register(registerDto);

      expect(result.access_token).toBe('fake.jwt.token');
      expect(result.empresa).toBeDefined();
      expect(mockPrisma.empresa.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rol: 'ADMIN' }),
        }),
      );
    });

    it('lanza BadRequestException cuando el email ya existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(MOCK_USUARIO);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
