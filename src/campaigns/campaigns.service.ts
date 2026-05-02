import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(publisherId: string, data: any) {
    const [newCampaign] = await this.db
      .insert(schema.campaigns)
      .values({
        publisherId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        goalAmount: data.goalAmount,
        monoJarUrl: data.monoJarUrl,
        status: 'pending',
      })
      .returning();
    return newCampaign;
  }

  async findAllActive() {
    return this.db.query.campaigns.findMany({
      where: eq(schema.campaigns.status, 'active'),
    });
  }

  async findAllPending() {
    return this.db.query.campaigns.findMany({
      where: eq(schema.campaigns.status, 'pending'),
    });
  }

  async updateStatus(id: string, status: 'active' | 'rejected' | 'closed') {
    const [updated] = await this.db
      .update(schema.campaigns)
      .set({ status })
      .where(eq(schema.campaigns.id, id))
      .returning();
    
    if (!updated) {
      throw new NotFoundException('Campaign not found');
    }
    return updated;
  }
}
