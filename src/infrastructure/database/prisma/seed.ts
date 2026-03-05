/* eslint-disable no-console */
import { resolve } from 'node:path';

import { PrismaClient } from '@infrastructure/database/generated/prisma';
import { AuthSeed } from '@infrastructure/database/prisma/seeds/auth';
import { SystemAdminSeed } from '@infrastructure/database/prisma/seeds/auth/systemAdmin.seed';
import { DemoSeed } from '@infrastructure/database/prisma/seeds/demo';
import { PrismaPg } from '@prisma/adapter-pg';
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

// Check if --demo flag was passed
const isDemo = process.argv.includes('--demo');

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // ========================================
  // 1) Datos maestros (siempre se ejecuta)
  // ========================================
  console.log('📋 Paso 1: Datos maestros (permisos, roles, system admin)\n');

  // Crear roles y permisos del sistema
  const authSeed = new AuthSeed(prisma);
  const authResult: ISeedResult = await authSeed.seed();

  // Crear system admin
  const systemAdminSeed = new SystemAdminSeed(prisma);
  const systemAdmin = await systemAdminSeed.seed();
  console.log('✅ System admin creado:', systemAdmin.email);

  console.log('\n📊 Resumen datos maestros:');
  console.log(`   - Roles del sistema: ${authResult.roles.length}`);
  console.log(`   - Permisos del sistema: ${authResult.permissions.length}`);
  console.log(`   - System Admin: ${systemAdmin.email}`);

  // ========================================
  // 2) Datos demo (solo con --demo flag)
  // ========================================
  if (isDemo) {
    console.log('\n📋 Paso 2: Datos de demostración\n');

    const demoSeed = new DemoSeed(prisma);
    await demoSeed.seed();

    console.log('📊 Resumen demo:\n');
    console.log('   === Nevada Tech Demo (COMPLETA) ===');
    console.log('   - Picking: habilitado | Multi-company: habilitado');
    console.log('   - Empresas: 3 (Hardware, Redes, Oficina) con productos asignados');
    console.log(
      '   - Usuarios: 7 (admin, supervisor, operador, vendedor, consultor, importador, inactivo)'
    );
    console.log('   - Credenciales: password "demo1234" para todos');
    console.log(
      '   - Productos: ~50 | Bodegas: 5 | Ventas: ~95 | Devoluciones: 20 | Transferencias: 20\n'
    );
    console.log('   === Distribuidora Lopez SAS (SIMPLE) ===');
    console.log('   - Picking: deshabilitado | Multi-company: deshabilitado');
    console.log('   - Usuarios: 4 (admin, supervisor, operador, vendedor)');
    console.log('   - Credenciales: password "demo1234" para todos');
    console.log(
      '   - Productos: ~50 | Bodegas: 5 | Ventas: ~95 | Devoluciones: 20 | Transferencias: 20'
    );
  } else {
    console.log('\n💡 Tip: Ejecuta con --demo para crear datos de demostración:');
    console.log('   bun run db:seed -- --demo');
  }

  console.log('\n🎉 Seed completado exitosamente!');
}

main()
  .catch(e => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
