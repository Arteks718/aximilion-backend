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
    return this.db.transaction(async (tx) => {
      // 1. Insert the campaign
      const [newCampaign] = await tx
        .insert(schema.campaigns)
        .values({
          publisherId,
          categoryId: data.categoryId,
          title: data.title,
          description: data.description,
          goalAmount: String(data.goalAmount),
          currency: data.currency || 'USD',
          monoJarUrl: data.monoJarUrl,
          status: 'pending',
        })
        .returning();

      // 2. Insert milestones if provided
      let createdMilestones: (typeof schema.milestones.$inferSelect)[] = [];
      if (data.milestones && data.milestones.length > 0) {
        createdMilestones = await tx
          .insert(schema.milestones)
          .values(
            data.milestones.map((m: any, index: number) => ({
              campaignId: newCampaign.id,
              title: m.title,
              amount: String(m.amount),
              sortOrder: index,
            })),
          )
          .returning();
      }

      return { ...newCampaign, milestones: createdMilestones };
    });
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
