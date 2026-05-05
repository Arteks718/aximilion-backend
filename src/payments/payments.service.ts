import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { BadgesService } from '../badges/badges.service';
import { eq, desc, sql } from 'drizzle-orm';
import StripeClient from 'stripe';
import type { Stripe } from 'stripe';
import { PaymentIntent } from 'node_modules/stripe/cjs/resources/PaymentIntents';
import { Event } from 'node_modules/stripe/cjs/resources/Events';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly badgesService: BadgesService,
    private readonly httpService: HttpService,
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

  async getMonobankJarStatus(jarId: string) {
  try {
    const response = await this.httpService.axiosRef.post('https://send.monobank.ua/api/handler', {
      "Pc": "BAg2rqDuXLHdmGMSozSifeYs62LNrlauyqYnchg2r3ms+W6zCKLh/mr/vGqm+/Um8LIGq6Ylcqb+VMquLb5u1pM=",
      "c": "hello",
      "clientId": jarId
    }, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        // Бекенд може вільно ставити User-Agent
        "User-Agent": "PostmanRuntime/7.53.0", 
      }
    });

    return response.data;
  } catch (error) {
    throw new BadRequestException('Failed to fetch data from Monobank');
  }
}

  async getLatestDonations() {
    return this.db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        currency: schema.payments.currency,
        createdAt: schema.payments.createdAt,
        donorName: sql<string>`COALESCE(${schema.users.email}, 'Anonymous')`,
      })
      .from(schema.payments)
      .leftJoin(schema.users, eq(schema.payments.donorId, schema.users.supabaseUid))
      .where(eq(schema.payments.status, 'success'))
      .orderBy(desc(schema.payments.createdAt))
      .limit(5);
  }
}