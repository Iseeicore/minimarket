import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ModuloApp } from '@prisma/client';
import { PermisosService } from './permisos.service';
import { PrismaService } from '../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------
const MOCK_USUARIO = {
  id: 2,
  empresaId: 1,
  nombre: 'Almacenero Test',
  email: 'almacen@test.com',
  rol: 'ALMACENERO',
  activo: true,
};

const MOCK_PERMISOS_DB = [
  { id: 1, usuarioId: 2, modulo: ModuloApp.VENTAS,   leer: true,  crear: true,  editar: false, eliminar: false },
  { id: 2, usuarioId: 2, modulo: ModuloApp.COMPRAS,  leer: true,  crear: false, editar: false, eliminar: false },
];

// ---------------------------------------------------------------------------
// Mock de PrismaService
// ---------------------------------------------------------------------------
const mockPrisma = {
  usuario: {
    findFirst: jest.fn(),
  },
  permisoUsuario: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('PermisosService', () => {
  let service: PermisosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermisosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PermisosService>(PermisosService);
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findByUsuario
  // -------------------------------------------------------------------------
  describe('findByUsuario', () => {
    it('retorna todos los modulos de la app con los permisos del usuario', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(MOCK_USUARIO);
      mockPrisma.permisoUsuario.findMany.mockResolvedValue(MOCK_PERMISOS_DB);

      const result = await service.findByUsuario(2, 1);

      expect(result).toHaveLength(Object.values(ModuloApp).length);

      const ventas = result.find((r) => r.modulo === ModuloApp.VENTAS);
      expect(ventas).toMatchObject({ leer: true, crear: true, editar: false, eliminar: false });

      const compras = result.find((r) => r.modulo === ModuloApp.COMPRAS);
      expect(compras).toMatchObject({ leer: true, crear: false, editar: false, eliminar: false });
    });

    it('modulos sin registro en DB aparecen con todos los permisos en false', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(MOCK_USUARIO);
      mockPrisma.permisoUsuario.findMany.mockResolvedValue([]);

      const result = await service.findByUsuario(2, 1);

      result.forEach((r) => {
        expect(r.leer).toBe(false);
        expect(r.crear).toBe(false);
        expect(r.editar).toBe(false);
        expect(r.eliminar).toBe(false);
      });
    });

    it('lanza NotFoundException cuando el usuario no pertenece a la empresa', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findByUsuario(99, 1)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.permisoUsuario.findMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // upsertByUsuario
  // -------------------------------------------------------------------------
  describe('upsertByUsuario', () => {
    const batchDto = {
      permisos: [
        { modulo: ModuloApp.VENTAS,  leer: true, crear: true,  editar: false, eliminar: false },
        { modulo: ModuloApp.COMPRAS, leer: true, crear: false, editar: false, eliminar: false },
      ],
    };

    it('hace upsert de los permisos enviados y retorna el estado completo', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(MOCK_USUARIO);
      mockPrisma.permisoUsuario.upsert.mockResolvedValue(MOCK_PERMISOS_DB[0]);
      mockPrisma.$transaction.mockImplementation((ops: Promise<any>[]) =>
        Promise.all(ops),
      );
      // findByUsuario interno despues del upsert
      mockPrisma.permisoUsuario.findMany.mockResolvedValue(MOCK_PERMISOS_DB);

      const result = await service.upsertByUsuario(2, 1, batchDto);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.permisoUsuario.upsert).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(Object.values(ModuloApp).length);
    });

    it('upsert llama con el where correcto por usuarioId + modulo', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(MOCK_USUARIO);
      mockPrisma.permisoUsuario.upsert.mockResolvedValue(MOCK_PERMISOS_DB[0]);
      mockPrisma.$transaction.mockImplementation((ops: Promise<any>[]) =>
        Promise.all(ops),
      );
      mockPrisma.permisoUsuario.findMany.mockResolvedValue(MOCK_PERMISOS_DB);

      await service.upsertByUsuario(2, 1, batchDto);

      expect(mockPrisma.permisoUsuario.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuarioId_modulo: { usuarioId: 2, modulo: ModuloApp.VENTAS } },
          create: expect.objectContaining({ usuarioId: 2, modulo: ModuloApp.VENTAS }),
        }),
      );
    });

    it('lanza NotFoundException cuando el usuario no pertenece a la empresa', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValue(null);

      await expect(service.upsertByUsuario(99, 1, batchDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
