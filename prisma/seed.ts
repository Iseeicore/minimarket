import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Empresa
  const empresa = await prisma.empresa.upsert({
    where: { id: 1 },
    update: {},
    create: { nombre: 'MedioMundo', ruc: '20000000001' },
  });

  // Unidades de medida
  await prisma.unidadMedida.createMany({
    data: [
      { nombre: 'Litros', abreviatura: 'LT' },
      { nombre: 'Mililitros', abreviatura: 'ML' },
      { nombre: 'Kilogramos', abreviatura: 'KG' },
      { nombre: 'Unidades', abreviatura: 'UN' },
      { nombre: 'Paquetes', abreviatura: 'PQ' },
    ],
    skipDuplicates: true,
  });

  // Categorías
  await prisma.categoria.createMany({
    data: [
      { nombre: 'Bebidas',  empresaId: empresa.id },
      { nombre: 'Lácteos',  empresaId: empresa.id },
      { nombre: 'Snacks',   empresaId: empresa.id },
      { nombre: 'Limpieza', empresaId: empresa.id },
    ],
    skipDuplicates: true,
  });

  // Almacenes
  const almacen1 = await prisma.almacen.upsert({
    where: { id: 1 },
    update: {},
    create: { empresaId: empresa.id, nombre: 'Almacén Principal', direccion: 'Av. Principal 123' },
  });

  await prisma.almacen.upsert({
    where: { id: 2 },
    update: {},
    create: { empresaId: empresa.id, nombre: 'Almacén Secundario', direccion: 'Calle Secundaria 456' },
  });

  // Usuario admin
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@minimarket.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: 'Administrador',
      email: 'admin@minimarket.com',
      passwordHash: hash,
      rol: 'ADMIN',
    },
  });

  // Usuario almacenero
  const hashAlm = await bcrypt.hash('alm123', 10);
  await prisma.usuario.upsert({
    where: { email: 'almacenero@minimarket.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      almacenId: almacen1.id,
      nombre: 'Almacenero Principal',
      email: 'almacenero@minimarket.com',
      passwordHash: hashAlm,
      rol: 'ALMACENERO',
    },
  });

  console.log('Seed completado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
