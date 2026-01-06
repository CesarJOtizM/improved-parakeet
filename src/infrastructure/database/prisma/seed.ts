/* eslint-disable no-console */
import { resolve } from 'node:path';

import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { AuthSeed } from '@infrastructure/database/prisma/seeds/auth';
import { SystemAdminSeed } from '@infrastructure/database/prisma/seeds/auth/systemAdmin.seed';
// import { InventorySeed } from '@infrastructure/database/prisma/seeds/inventory';
import { PrismaPg } from '@prisma/adapter-pg';
// import { IInventorySeedResult, ISeedResult } from '@shared/types/database.types';
import { ISeedResult } from '@shared/types/database.types';
import { config } from 'dotenv';
import { Pool } from 'pg';

// Load .env file explicitly before using process.env
config({ path: resolve(process.cwd(), '.env') });

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined. Please set it in your .env file.');
}

// Build database URL with connection pooling parameters if not present
function buildDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  // Parse existing URL
  const url = new URL(databaseUrl);

  // Add connection pooling parameters if not present
  const connectionLimit = process.env.DB_CONNECTION_LIMIT || '10';
  const poolTimeout = process.env.DB_POOL_TIMEOUT || '10';

  // Prisma uses connection_limit and pool_timeout query parameters
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', String(connectionLimit));
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', String(poolTimeout));
  }

  // Set the updated URL back to process.env for Prisma
  process.env.DATABASE_URL = url.toString();

  return url.toString();
}

// Build and set DATABASE_URL before creating PrismaClient
const databaseUrl = buildDatabaseUrl();

// Parse database URL to extract connection parameters
const url = new URL(databaseUrl);

// Create PostgreSQL adapter for Prisma 7.2.0
// Prisma 7.2.0 requires an adapter when using custom output path
// Configure SSL for Supabase and other cloud providers
const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    url.hostname.includes('supabase') || url.hostname.includes('amazonaws.com')
      ? { rejectUnauthorized: false }
      : undefined,
});
const adapter = new PrismaPg(pool);

// Create PrismaClient with adapter
// In Prisma 7.2.0, when using custom output, you must provide an adapter or accelerateUrl
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Sembrar dominio de autenticación (roles y permisos del sistema)
  const authSeed = new AuthSeed(prisma);
  const authResult: ISeedResult = await authSeed.seed();

  // Crear system admin
  const systemAdminSeed = new SystemAdminSeed(prisma);
  const systemAdmin = await systemAdminSeed.seed();
  console.log('✅ System admin creado:', systemAdmin.email);

  // Comentado: Organización demo y datos de inventario
  // Descomentar cuando se necesite crear datos de prueba
  /*
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

  console.log('✅ Organización demo creada:', organization.name);

  // Sembrar dominio de inventario para la organización demo
  const inventorySeed = new InventorySeed(prisma);
  const inventoryResult: IInventorySeedResult = await inventorySeed.seed(organization.id);
  */

  console.log('🎉 Seed completado exitosamente!');
  console.log('📊 Resumen:');
  console.log(`   - System Admin: ${systemAdmin.email} (system@admin.com)`);
  console.log(`   - Roles: ${authResult.roles.length}`);
  console.log(`   - Permisos: ${authResult.permissions.length}`);
  // console.log(`   - Organización Demo: ${organization.name}`);
  // console.log(`   - Bodegas: ${inventoryResult.warehouses.length}`);
  // console.log(`   - Productos: ${inventoryResult.products.length}`);
  // console.log(`   - Stock inicial configurado`);
  // console.log(`   - Movimientos de ejemplo creados`);
}

main()
  .catch(e => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
