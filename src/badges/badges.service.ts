import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, count, and } from 'drizzle-orm';

@Injectable()
export class BadgesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async checkAndAssignBadges(userId: string) {
    const result = await this.db.select({ count: count() })
      .from(schema.payments)
      .where(and(eq(schema.payments.donorId, userId), eq(schema.payments.status, 'success')));
    
    const donationsCount = result[0].count;

    if (donationsCount >= 5) {
      const badge = await this.db.query.badges.findFirst({
        where: eq(schema.badges.requiredDonationsCount, 5)
      });
      
      if (badge) {
        const existing = await this.db.query.userBadges.findFirst({
          where: and(eq(schema.userBadges.userId, userId), eq(schema.userBadges.badgeId, badge.id))
        });
        
        if (!existing) {
          await this.db.insert(schema.userBadges).values({
            userId,
            badgeId: badge.id
          });
        }
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
}
