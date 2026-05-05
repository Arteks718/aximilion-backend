import { Post, UseGuards, Controller, Headers, Req, Body, Param, Get, BadRequestException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  /**
   * POST /payments/create-intent
   * Creates a test PaymentIntent and stores a pending transaction.
   * Returns { clientSecret, transactionId }
   */
  @Post('create-intent')
  async createIntent(
    @Body() body: { campaignId: string; amount: number; currency?: string, userId: string | null },
  ) {
    return this.paymentsService.createPaymentIntent(body);
  }

  /**
   * POST /payments/webhook
   * Receives events from Stripe (e.g., payment_intent.succeeded)
   */
  @Post('webhook')
  async webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    return this.paymentsService.handleWebhook(signature, rawBody);
  }

  @Get('mono-status/:jarId')
  async getMonoStatus(@Param('jarId') jarId: string) {
    return this.paymentsService.getMonobankJarStatus(jarId);
  }
}
