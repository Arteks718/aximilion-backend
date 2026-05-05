import { Injectable, Inject, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, count, and, sum, countDistinct } from 'drizzle-orm';

@Injectable()
export class BadgesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async checkAndAssignBadges(supabaseUid: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.supabaseUid, supabaseUid)
    });
    if (!user) return;
    const internalUserId = user.id;

    const [stats] = await this.db
      .select({
        donationsCount: count(schema.payments.id),
        totalAmountCents: sum(schema.payments.amount),
        uniqueCampaignsCount: countDistinct(schema.payments.campaignId),
      })
      .from(schema.payments)
      .where(and(eq(schema.payments.donorId, supabaseUid), eq(schema.payments.status, 'success')));

    const donationsCount = stats?.donationsCount || 0;
    const totalAmount = (parseInt(stats?.totalAmountCents || '0', 10)) / 100;
    const uniqueCampaignsCount = stats?.uniqueCampaignsCount || 0;

    const badges = await this.db.query.badges.findMany();

    for (const badge of badges) {
      let earned = false;
      const threshold = parseFloat(badge.criteriaValue as any);

      switch (badge.criteriaType) {
        case 'donations_count':
          earned = donationsCount >= threshold;
          break;
        case 'total_amount':
          earned = totalAmount >= threshold;
          break;
        case 'unique_campaigns':
          earned = uniqueCampaignsCount >= threshold;
          break;
      }

      if (earned) {
        await this.db.insert(schema.userBadges).values({
          userId: internalUserId,
          badgeId: badge.id
        }).onConflictDoNothing();
      }
    }
  }

  async getMyBadges(userId: string) {
    const userBadgesList = await this.db.query.userBadges.findMany({
      where: eq(schema.userBadges.userId, userId),
      with: {
        badge: true
      }
    });
    return userBadgesList.map(ub => ub.badge);
  }

  async createBadge(data: any, file?: Express.Multer.File) {
    let iconUrl = data.icon_url;

    if (file) {
      const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SECRET_KEY || '');
      const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      const { error } = await supabase.storage.from('badges').upload(filename, file.buffer, {
        contentType: file.mimetype,
      });

      if (error) {
        throw new InternalServerErrorException('Failed to upload badge icon: ' + error.message);
      }

      const { data: publicUrlData } = supabase.storage.from('badges').getPublicUrl(filename);
      iconUrl = publicUrlData.publicUrl;
    }

    if (!iconUrl) {
      throw new BadRequestException('Icon file or icon_url is required');
    }

    const [badge] = await this.db.insert(schema.badges).values({
      name: data.name,
      iconUrl: iconUrl,
      criteriaType: data.criteria_type,
      criteriaValue: String(data.criteria_value),
    }).returning();
    return badge;
  }
}
