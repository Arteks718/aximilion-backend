import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, count, sum } from 'drizzle-orm';

@Injectable()
export class StatsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getStats() {
    // Total registered users
    const usersResult = await this.db
      .select({ count: count() })
      .from(schema.users);
    const totalUsers = usersResult[0].count;

    // Total active campaigns
    const activeCampaignsResult = await this.db
      .select({ count: count() })
      .from(schema.campaigns)
      .where(eq(schema.campaigns.status, 'active'));
    const totalActiveCampaigns = activeCampaignsResult[0].count;

    // Total amount collected across all campaigns
    const amountResult = await this.db
      .select({ totalAmount: sum(schema.campaigns.collectedInternal) })
      .from(schema.campaigns);
    const totalAmountCollected = amountResult[0].totalAmount || '0';

    return {
      totalUsers,
      totalActiveCampaigns,
      totalAmountCollected,
    };
  }
}
