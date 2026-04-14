import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from the current directory to ensure it's picked up
// even when Prisma CLI says it's skipping environment variable loading.
dotenv.config({ path: path.join(__dirname, '.env') });

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
