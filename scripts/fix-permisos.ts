/**
 * Script de reparación: re-sincroniza permisos de todos los usuarios
 * con PERMISOS_DEFAULT actual para su rol.
 *
 * Uso: npx ts-node --project tsconfig.json scripts/fix-permisos.ts
 */
import { PrismaClient, RolUsuario } from '@prisma/client';
import { PERMISOS_DEFAULT } from '../src/common/constants/permisos-default';

const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.usuario.findMany({
    where: { rol: { in: [RolUsuario.JEFE_ALMACEN, RolUsuario.ALMACENERO, RolUsuario.JEFE_VENTA] } },
    select: { id: true, nombre: true, rol: true },
  });

  console.log(`Usuarios a procesar: ${usuarios.length}`);

  for (const u of usuarios) {
    const defaults = PERMISOS_DEFAULT[u.rol];
    if (!defaults?.length) {
      console.log(`  ⚠  ${u.nombre} (${u.rol}) — sin defaults definidos, saltando`);
      continue;
    }

    await prisma.$transaction([
      prisma.permisoUsuario.deleteMany({ where: { usuarioId: u.id } }),
      prisma.permisoUsuario.createMany({
        data: defaults.map((p) => ({ ...p, usuarioId: u.id })),
      }),
    ]);

    console.log(`  ✓  ${u.nombre} (${u.rol}) — ${defaults.length} permisos sincronizados`);
  }

  console.log('\nListo. Permisos actualizados correctamente.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
