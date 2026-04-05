import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Prisma commands. Check apps/api/.env');
}

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
});
