import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import { categories } from '../src/db/schema';

async function seed() {
  console.log('⏳ Seeding categories...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  const values = [
    { name: 'Medical', iconPrefix: 'pi-heart' },
    { name: 'Military', iconPrefix: 'pi-shield' },
    { name: 'Animals', iconPrefix: 'pi-paw' },
    { name: 'Rebuild', iconPrefix: 'pi-home' },
  ];

  await db.insert(categories).values(values).onConflictDoNothing();

  console.log('✅ Done!');
  await pool.end();
  process.exit(0);
}

seed();