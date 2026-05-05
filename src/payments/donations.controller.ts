import * as common from '@nestjs/common';
import { PaymentsService } from './payments.service';

@common.Controller('donations')
export class DonationsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @common.Get('latest')
  async getLatestDonations() {
    return this.paymentsService.getLatestDonations();
  }
}
