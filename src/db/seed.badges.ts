import { config } from 'dotenv';
config();
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

async function seed() {
  console.log('Seeding badges...');
  
  const bucketUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/badges`;

  await db.insert(schema.badges).values([
    {
      name: 'First Gift',
      iconUrl: `${bucketUrl}/first-gift.png`,
      criteriaType: 'donations_count',
      criteriaValue: '1',
    },
    {
      name: 'Monthly Hero',
      iconUrl: `${bucketUrl}/monthly-hero.png`,
      criteriaType: 'donations_count',
      criteriaValue: '5',
    },
    {
      name: '10k Club',
      iconUrl: `${bucketUrl}/10k-club.png`,
      criteriaType: 'total_amount',
      criteriaValue: '10000',
    },
    {
      name: 'Global Reach',
      iconUrl: `${bucketUrl}/global-reach.png`,
      criteriaType: 'unique_campaigns',
      criteriaValue: '3',
    },
  ]).onConflictDoNothing();

  console.log('Badges seeded successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
