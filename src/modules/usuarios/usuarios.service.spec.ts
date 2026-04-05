import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------
const MOCK_USUARIO = {
  id: 2,
  empresaId: 1,
  almacenId: null,
  nombre: 'Juan Perez',
  email: 'juan@test.com',
  rol: 'ALMACENERO',
  activo: true,
  creadoEn: new Date('2026-01-01T00:00:00.000Z'),
  empresa: { id: 1, nombre: 'Empresa Test SA' },
  almacen: null,
};

const CREATE_DTO = {
  nombre: 'Juan Perez',
  email: 'juan@test.com',
  password: 'password123',
  rol: 'ALMACENERO' as any,
  almacenId: undefined,
};

// ---------------------------------------------------------------------------
// Mock de PrismaService
// ---------------------------------------------------------------------------
const mockPrisma = {
  usuario: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('retorna la lista de usuarios de la empresa', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([MOCK_USUARIO]);

      const result = await service.findAll(1);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('juan@test.com');
      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 1 } }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    it('retorna el usuario cuando existe en la empresa', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(MOCK_USUARIO);

      const result = await service.findOne(2, 1);

      expect(result.id).toBe(2);
      expect(result.email).toBe('juan@test.com');
    });

    it('lanza NotFoundException cuando el usuario no existe', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findOne(99, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('crea un usuario nuevo y retorna sus datos', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('$2b$10$hashedpwd' as never);
      mockPrisma.usuario.create.mockResolvedValue(MOCK_USUARIO);

      const result = await service.create(CREATE_DTO, 1);

      expect(result.email).toBe('juan@test.com');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrisma.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'juan@test.com',
            empresaId: 1,
          }),
        }),
      );
    });

    it('lanza BadRequestException cuando el email ya esta en uso', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(MOCK_USUARIO);

      await expect(service.create(CREATE_DTO, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.usuario.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('actualiza datos del usuario sin tocar la contrasena si no se envia', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(MOCK_USUARIO);
      mockPrisma.usuario.update.mockResolvedValue({ ...MOCK_USUARIO, nombre: 'Juan Actualizado' });

      const result = await service.update(2, { nombre: 'Juan Actualizado' }, 1);

      expect(result.nombre).toBe('Juan Actualizado');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('hashea la nueva contrasena cuando se envia en el DTO', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(MOCK_USUARIO);
      mockBcrypt.hash.mockResolvedValue('$2b$10$newhash' as never);
      mockPrisma.usuario.update.mockResolvedValue(MOCK_USUARIO);

      await service.update(2, { password: 'newpassword123' }, 1);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: '$2b$10$newhash' }),
        }),
      );
    });

    it('lanza NotFoundException cuando el usuario no existe', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(null);

      await expect(service.update(99, { nombre: 'Nuevo' }, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------
  describe('remove', () => {
    it('desactiva el usuario (soft delete) sin eliminarlo de la BD', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(MOCK_USUARIO);
      mockPrisma.usuario.update.mockResolvedValue({ ...MOCK_USUARIO, activo: false });

      const result = await service.remove(2, 1);

      expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: { activo: false },
        }),
      );
      expect(result.activo).toBe(false);
    });

    it('lanza NotFoundException cuando el usuario no existe', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(null);

      await expect(service.remove(99, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
