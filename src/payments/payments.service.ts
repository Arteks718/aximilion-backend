import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { BadgesService } from '../badges/badges.service';
import { eq } from 'drizzle-orm';
import StripeClient from 'stripe';
import type { Stripe } from 'stripe';
import { PaymentIntent } from 'node_modules/stripe/cjs/resources/PaymentIntents';
import { Event } from 'node_modules/stripe/cjs/resources/Events';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly badgesService: BadgesService,
  ) {

    this.stripe = new StripeClient(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true
    });
  }

  /**
   * Create PaymentIntent with Stripe
   */
  async createPaymentIntent(dto: { campaignId: string; amount: number; currency?: string }, userId?: string) {
    const amountInCents = Math.round(dto.amount * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: dto.currency ?? 'usd',
      metadata: {
        campaignId: dto.campaignId,
        userId: userId ?? 'anonymous',
      },
    });

    const [payment] = await this.db
      .insert(schema.payments)
      .values({
        donorId: userId ?? null,
        campaignId: dto.campaignId,
        amount: amountInCents, // Better save in cents
        currency: dto.currency ?? 'usd',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
      })
      .returning();

    // Return clientSecret and paymentId for frontend
    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    let event: Event;
    console.log('test webhook', signature, payload)
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as PaymentIntent;
      await this.processSuccessfulPayment(paymentIntent);
    }

    return { received: true };
  }

  private async processSuccessfulPayment(intent: PaymentIntent) {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.stripePaymentIntentId, intent.id))
      .limit(1);

    console.log('Payment found', payment);

    if (!payment || payment.status === 'success') return;

    await this.db
      .update(schema.payments)
      .set({ status: 'success' })
      .where(eq(schema.payments.id, payment.id));

    const campaign = await this.db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, payment.campaignId),
    });

    if (campaign) {
      const amountInCurrency = payment.amount / 100;
      const newTotal = (parseFloat(campaign.collectedInternal as string) + amountInCurrency).toFixed(2);
      
      await this.db.update(schema.campaigns)
        .set({ collectedInternal: newTotal })
        .where(eq(schema.campaigns.id, payment.campaignId));
    }

    // Видаємо бейджі
    if (payment.donorId) {
      await this.badgesService.checkAndAssignBadges(payment.donorId);
    }
  }
}