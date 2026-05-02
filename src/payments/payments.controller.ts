import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  async wayForPayWebhook(@Body() body: any) {
    const payment = await this.paymentsService.processWayForPayWebhook(body);
    return { status: 'success', paymentId: payment.id };
  }
}
