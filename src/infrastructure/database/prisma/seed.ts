/* eslint-disable no-console */
import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { AuthSeed } from '@infrastructure/database/prisma/seeds/auth.seed';
import { InventorySeed } from '@infrastructure/database/prisma/seeds/inventory.seed';
import { IInventorySeedResult, ISeedResult } from '@shared/types/database.types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear organización de prueba
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Organización Demo',
      slug: 'demo-org',
      domain: 'demo.inventory.com',
      isActive: true,
    },
  });

  console.log('✅ Organización creada:', organization.name);

  // Sembrar dominio de autenticación
  const authSeed = new AuthSeed(prisma);
  const authResult: ISeedResult = await authSeed.seed(organization.id);

  // Sembrar dominio de inventario
  const inventorySeed = new InventorySeed(prisma);
  const inventoryResult: IInventorySeedResult = await inventorySeed.seed(organization.id);

  console.log('🎉 Seed completado exitosamente!');
  console.log('📊 Resumen:');
  console.log(`   - Organización: ${organization.name}`);
  console.log(`   - Roles: ${authResult.roles.length}`);
  console.log(`   - Permisos: ${authResult.permissions.length}`);
  console.log(`   - Usuarios: 1 (admin)`);
  console.log(`   - Bodegas: ${inventoryResult.warehouses.length}`);
  console.log(`   - Productos: ${inventoryResult.products.length}`);
  console.log(`   - Stock inicial configurado`);
  console.log(`   - Movimientos de ejemplo creados`);
}

main()
  .catch(e => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
