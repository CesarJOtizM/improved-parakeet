/* eslint-disable no-console */
import { PrismaClient } from '../generated/prisma';

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

  // Crear roles predefinidos
  const adminRole = await prisma.role.upsert({
    where: { name_orgId: { name: 'ADMIN', orgId: organization.id } },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador del sistema',
      isActive: true,
      orgId: organization.id,
    },
  });

  const supervisorRole = await prisma.role.upsert({
    where: { name_orgId: { name: 'SUPERVISOR', orgId: organization.id } },
    update: {},
    create: {
      name: 'SUPERVISOR',
      description: 'Supervisor de bodegas',
      isActive: true,
      orgId: organization.id,
    },
  });

  const operatorRole = await prisma.role.upsert({
    where: { name_orgId: { name: 'OPERATOR', orgId: organization.id } },
    update: {},
    create: {
      name: 'OPERATOR',
      description: 'Operador de bodega',
      isActive: true,
      orgId: organization.id,
    },
  });

  console.log('✅ Roles creados:', [adminRole.name, supervisorRole.name, operatorRole.name]);

  // Crear usuario administrador
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'Demo',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // password: admin123
      isActive: true,
      orgId: organization.id,
    },
  });

  console.log('✅ Usuario administrador creado:', adminUser.email);

  // Asignar rol de administrador
  await prisma.userRole.upsert({
    where: {
      userId_roleId_orgId: {
        userId: adminUser.id,
        roleId: adminRole.id,
        orgId: organization.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      orgId: organization.id,
    },
  });

  // Crear bodega de prueba
  const warehouse = await prisma.warehouse.upsert({
    where: { code_orgId: { code: 'BODEGA-001', orgId: organization.id } },
    update: {},
    create: {
      code: 'BODEGA-001',
      name: 'Bodega Principal',
      description: 'Bodega principal de la organización',
      address: 'Calle Principal 123, Ciudad',
      isActive: true,
      orgId: organization.id,
    },
  });

  console.log('✅ Bodega creada:', warehouse.name);

  // Crear productos de prueba
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku_orgId: { sku: 'PROD-001', orgId: organization.id } },
      update: {},
      create: {
        sku: 'PROD-001',
        name: 'Laptop Dell XPS 13',
        description: 'Laptop ultrabook de 13 pulgadas',
        category: 'Electrónicos',
        unit: 'Unidad',
        price: 1299.99,
        isActive: true,
        orgId: organization.id,
      },
    }),
    prisma.product.upsert({
      where: { sku_orgId: { sku: 'PROD-002', orgId: organization.id } },
      update: {},
      create: {
        sku: 'PROD-002',
        name: 'Mouse Inalámbrico Logitech',
        description: 'Mouse inalámbrico ergonómico',
        category: 'Accesorios',
        unit: 'Unidad',
        price: 29.99,
        isActive: true,
        orgId: organization.id,
      },
    }),
    prisma.product.upsert({
      where: { sku_orgId: { sku: 'PROD-003', orgId: organization.id } },
      update: {},
      create: {
        sku: 'PROD-003',
        name: 'Teclado Mecánico RGB',
        description: 'Teclado mecánico con switches Cherry MX',
        category: 'Accesorios',
        unit: 'Unidad',
        price: 149.99,
        isActive: true,
        orgId: organization.id,
      },
    }),
  ]);

  console.log(
    '✅ Productos creados:',
    products.map(p => p.name)
  );

  // Crear stock inicial
  await Promise.all([
    prisma.stock.upsert({
      where: {
        productId_warehouseId_orgId: {
          productId: products[0].id,
          warehouseId: warehouse.id,
          orgId: organization.id,
        },
      },
      update: {},
      create: {
        productId: products[0].id,
        warehouseId: warehouse.id,
        quantity: 10,
        unitCost: 1100.0,
        orgId: organization.id,
      },
    }),
    prisma.stock.upsert({
      where: {
        productId_warehouseId_orgId: {
          productId: products[1].id,
          warehouseId: warehouse.id,
          orgId: organization.id,
        },
      },
      update: {},
      create: {
        productId: products[1].id,
        warehouseId: warehouse.id,
        quantity: 50,
        unitCost: 25.0,
        orgId: organization.id,
      },
    }),
    prisma.stock.upsert({
      where: {
        productId_warehouseId_orgId: {
          productId: products[2].id,
          warehouseId: warehouse.id,
          orgId: organization.id,
        },
      },
      update: {},
      create: {
        productId: products[2].id,
        warehouseId: warehouse.id,
        quantity: 25,
        unitCost: 120.0,
        orgId: organization.id,
      },
    }),
  ]);

  console.log('✅ Stock inicial creado');

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch(e => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })

  .finally(async () => {
    await prisma.$disconnect();
  });
