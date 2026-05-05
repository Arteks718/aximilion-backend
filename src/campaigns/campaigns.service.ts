import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { desc, eq, and, gte, lte, asc, sql, SQL, count } from 'drizzle-orm';
import { FilterCampaignsDto } from './dto/filter-campaigns.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(publisherId: string, data: any) {
    return this.db.transaction(async (tx) => {
      // 1. Insert the campaign (including inline file URLs)
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
          images: data.images || null,
          legalProofUrl: data.legalProofUrl || null,
          financialAuditUrl: data.financialAuditUrl || null,
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

  /**
   * Find campaigns with filtering, sorting, and pagination for the Explore page.
   * Returns { data, totalCount } so the frontend can compute pagination.
   */
  async findFiltered(filters: FilterCampaignsDto) {
    const {
      category,
      minGoal,
      maxGoal,
      verified,
      sortBy = 'recent',
      page = 1,
      limit = 12,
    } = filters;

    // ── Build dynamic WHERE conditions ──────────────────────────
    const conditions: SQL[] = [];

    // By default only show active (verified) campaigns on Explore
    if (verified === true || verified === undefined) {
      conditions.push(eq(schema.campaigns.status, 'active'));
    }
    // verified === false → show all statuses (no status filter)

    if (category) {
      conditions.push(eq(schema.campaigns.categoryId, category));
    }

    if (minGoal !== undefined) {
      conditions.push(
        gte(schema.campaigns.goalAmount, String(minGoal)),
      );
    }

    if (maxGoal !== undefined) {
      conditions.push(
        lte(schema.campaigns.goalAmount, String(maxGoal)),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // ── Count total matching rows ───────────────────────────────
    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(schema.campaigns)
      .where(whereClause);

    // ── Determine ORDER BY ──────────────────────────────────────
    let orderByClause: SQL;
    switch (sortBy) {
      case 'funded':
        // Progress = collected_internal / goal_amount  (descending — most funded first)
        orderByClause = sql`(${schema.campaigns.collectedInternal}::numeric / NULLIF(${schema.campaigns.goalAmount}::numeric, 0)) DESC NULLS LAST`;
        break;
      case 'ending':
        // Soonest deadline first; nulls go to the end
        orderByClause = sql`${schema.campaigns.endDate} ASC NULLS LAST`;
        break;
      case 'recent':
      default:
        orderByClause = sql`${schema.campaigns.createdAt} DESC`;
        break;
    }

    // ── Fetch paginated rows ────────────────────────────────────
    const offset = (page - 1) * limit;

    const data = await this.db
      .select()
      .from(schema.campaigns)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return { data, totalCount };
  }

  /** Find a single campaign by ID (for the detail page). */
  async findById(id: string) {
    const campaign = await this.db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, id),
      with: {
        milestones: true,
        category: true,
      },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  /** Legacy helper — still used by HomeView (top active campaigns). */
  async findAllActive(limit: number = 10, offset: number = 0) {
    return this.db.query.campaigns.findMany({
      where: eq(schema.campaigns.status, 'active'),
      limit,
      offset,
      orderBy: desc(schema.campaigns.createdAt)
    });
  }

  async findAllPending() {
    return this.db.query.campaigns.findMany({
      where: eq(schema.campaigns.status, 'pending'),
      orderBy: desc(schema.campaigns.createdAt),
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

  async getDonations(campaignId: string, limit: number = 5, offset: number = 0) {
    const queryLimit = limit + 1;
    const results = await this.db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        currency: schema.payments.currency,
        createdAt: schema.payments.createdAt,
        donorName: sql<string>`COALESCE(${schema.users.email}, 'Anonymous')`,
      })
      .from(schema.payments)
      .leftJoin(schema.users, eq(schema.payments.donorId, schema.users.supabaseUid))
      .where(
        and(
          eq(schema.payments.campaignId, campaignId),
          eq(schema.payments.status, 'success')
        )
      )
      .orderBy(desc(schema.payments.createdAt))
      .limit(queryLimit)
      .offset(offset);

    const hasMore = results.length > limit;
    const donations = hasMore ? results.slice(0, limit) : results;

    return { donations, hasMore };
  }
}
