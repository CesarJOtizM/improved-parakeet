import path from 'node:path';

// eslint-disable-next-line import/order
import { config } from 'dotenv';
// Cargar variables de entorno desde .env
config();

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('src', 'infrastructure', 'database', 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join('src', 'infrastructure', 'database', 'migrations'),
    seed: 'tsx ./src/infrastructure/database/prisma/seed.ts',
  },
});
