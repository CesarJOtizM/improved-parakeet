import 'dotenv/config';
import path from 'node:path';

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: path.join('src', 'infrastructure', 'database', 'prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
    ...(process.env.DIRECT_DATABASE_URL ? { directUrl: process.env.DIRECT_DATABASE_URL } : {}),
  },
  migrations: {
    path: path.join('src', 'infrastructure', 'database', 'migrations'),
    seed: 'tsx ./src/infrastructure/database/prisma/seed.ts',
  },
});
