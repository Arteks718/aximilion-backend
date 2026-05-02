import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider: Provider = {
  provide: DATABASE_CONNECTION,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const connectionString = configService.get<string>('DATABASE_URL');
    const pool = new Pool({
      connectionString,
    });
    try {
      const client = await pool.connect();
      await client.query('SELECT 1'); // Lightweight ping
      client.release();
      console.log('Database connection successful');
    } catch (error) {
      console.error('Failed to connect to the database:', error.message);
      throw error; // Prevents the NestJS app from starting with a dead connection
    }
    return drizzle(pool, { schema });
  },
};
