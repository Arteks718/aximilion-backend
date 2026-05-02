import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { BadgesService } from '../badges/badges.service';
import { eq } from 'drizzle-orm';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly badgesService: BadgesService,
  ) {}

  async processWayForPayWebhook(data: any) {
    const [payment] = await this.db.insert(schema.payments).values({
      campaignId: data.campaignId,
      amount: data.amount,
      donorId: data.donorId,
      provider: 'wayforpay',
      status: data.status === 'Approved' ? 'completed' : 'failed'
    }).returning();

    if (payment.status === 'completed' && payment.donorId) {
      await this.badgesService.checkAndAssignBadges(payment.donorId);
      
      const campaign = await this.db.query.campaigns.findFirst({
        where: eq(schema.campaigns.id, payment.campaignId)
      });
      if (campaign) {
        const newTotal = (parseFloat(campaign.collectedInternal) + parseFloat(payment.amount as any)).toString();
        await this.db.update(schema.campaigns)
          .set({ collectedInternal: newTotal })
          .where(eq(schema.campaigns.id, payment.campaignId));
      }
    }

    return payment;
  }
}
