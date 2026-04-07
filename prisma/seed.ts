import 'dotenv/config';
import { PrismaClient, RolUsuario } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PERMISOS_DEFAULT } from '../src/common/constants/permisos-default';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DE DEPLOY — IDs predecibles desde 1
//
// Empresa:   1 → MedioMundo
// Almacén:   1 → Almacén Principal
// Usuarios:  1 → Administrador     (ADMIN)
//            2 → Almacenero        (ALMACENERO,   almacenId=1)
//            3 → María Tienda      (JEFE_VENTA,   almacenId=1)
//            4 → Juan Almacén      (JEFE_ALMACEN, almacenId=1)
//            5 → SISTEMA           (ADMIN — cron jobs)
//
// ENV esperado:
//   CAJA_AUTO_ALMACENES=1
//   CAJA_USUARIO_SISTEMA_ID=5
// ═══════════════════════════════════════════════════════════════════════════════

const USUARIOS = [
  { nombre: 'Administrador',      email: 'admin@minimarket.com',         password: 'admin123',   rol: 'ADMIN'        as RolUsuario, almacen: false },
  { nombre: 'Almacenero Principal',email: 'almacenero@minimarket.com',   password: 'alm123',     rol: 'ALMACENERO'   as RolUsuario, almacen: true  },
  { nombre: 'Felipe Tienda',      email: 'jefe.tienda@minimarket.com',   password: 'tienda123',  rol: 'JEFE_VENTA'   as RolUsuario, almacen: true  },
  { nombre: 'Eddy Almacén',      email: 'jefe.almacen@minimarket.com',  password: 'almacen123', rol: 'JEFE_ALMACEN' as RolUsuario, almacen: true  },
  { nombre: 'SISTEMA',            email: 'sistema@minimarket.internal',  password: 'x'.repeat(32), rol: 'ADMIN'      as RolUsuario, almacen: false },
];

async function main() {
  console.log('🌱 Seed de deploy — IDs predecibles\n');

  // ── 1. Reset sequences para que IDs arranquen desde 1 ──
  await prisma.$executeRawUnsafe(`TRUNCATE empresas, almacenes, usuarios, permisos_usuario RESTART IDENTITY CASCADE`);
  console.log('✓ Tablas limpiadas, sequences reseteadas');

  // ── 2. Empresa ──
  const empresa = await prisma.empresa.create({
    data: { nombre: 'MedioMundo', ruc: '20000000001' },
  });
  console.log(`✓ Empresa: id=${empresa.id} — ${empresa.nombre}`);

  // ── 3. Almacén ──
  const almacen = await prisma.almacen.create({
    data: { empresaId: empresa.id, nombre: 'Almacén Principal', direccion: 'Av. Principal 123' },
  });
  console.log(`✓ Almacén: id=${almacen.id} — ${almacen.nombre}`);

  // ── 4. Usuarios + permisos ──
  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.password, 10);
    const usuario = await prisma.usuario.create({
      data: {
        empresaId:    empresa.id,
        almacenId:    u.almacen ? almacen.id : null,
        nombre:       u.nombre,
        email:        u.email,
        passwordHash: hash,
        rol:          u.rol,
      },
    });

    // Insertar permisos según PERMISOS_DEFAULT (ADMIN tiene bypass, no necesita)
    const permisos = PERMISOS_DEFAULT[u.rol];
    if (permisos && permisos.length > 0) {
      await prisma.permisoUsuario.createMany({
        data: permisos.map((p) => ({
          usuarioId: usuario.id,
          modulo:    p.modulo,
          leer:      p.leer,
          crear:     p.crear,
          editar:    p.editar,
          eliminar:  p.eliminar,
        })),
      });
    }

    const tag = u.rol === 'ADMIN' && u.nombre === 'SISTEMA' ? ' ← CRON' : '';
    console.log(`✓ Usuario: id=${usuario.id} — ${u.nombre} (${u.rol})${tag}`);
  }

  // ── 5. Resumen ENV ──
  console.log('\n═══════════════════════════════════════');
  console.log('Variables ENV para deploy:\n');
  console.log(`  CAJA_AUTO_ALMACENES=${almacen.id}`);
  console.log(`  CAJA_USUARIO_SISTEMA_ID=5`);
  console.log('\n═══════════════════════════════════════');
  console.log('\n✅ Seed completado. Productos y categorías se agregan después.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
