import * as common from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@common.Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  /**
   * POST /payments/create-intent
   * Creates a test PaymentIntent and stores a pending transaction.
   * Returns { clientSecret, transactionId }
   */
  @common.Post('create-intent')
  async createIntent(
    @common.Body() body: { campaignId: string; amount: number; currency?: string },
    @common.Req() req: any,
  ) {
    const userId = req.user?.supabase_uid as string;
    return this.paymentsService.createPaymentIntent(body, userId);
  }

  /**
   * POST /payments/webhook
   * Receives events from Stripe (e.g., payment_intent.succeeded)
   */
  @common.Post('webhook')
  async webhook(
    @common.Headers('stripe-signature') signature: string,
    @common.Req() req: common.RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new common.BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new common.BadRequestException('Missing raw body');
    }

    return this.paymentsService.handleWebhook(signature, rawBody);
  }

  @common.Get('mono-status/:jarId')
  async getMonoStatus(@common.Param('jarId') jarId: string) {
    return this.paymentsService.getMonobankJarStatus(jarId);
  }
}
