import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, count, sum, or } from 'drizzle-orm';

@Injectable()
export class StatsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getPlatformStats() {
    const [donorsResult, campaignsResult, fundsResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(schema.users)
        .where(eq(schema.users.role, 'registered')),
      this.db
        .select({ count: count() })
        .from(schema.campaigns)
        .where(or(eq(schema.campaigns.status, 'active'), eq(schema.campaigns.status, 'closed'))),
      this.db
        .select({ totalAmount: sum(schema.payments.amount) })
        .from(schema.payments)
        .where(eq(schema.payments.status, 'success'))
    ]);

    const totalDonors = donorsResult[0]?.count || 0;
    const activeCampaigns = campaignsResult[0]?.count || 0;
    const totalFundsRaised = (Number(fundsResult[0]?.totalAmount) || 0) / 100;

    return {
      totalDonors,
      activeCampaigns,
      totalFundsRaised,
    };
  }
}
