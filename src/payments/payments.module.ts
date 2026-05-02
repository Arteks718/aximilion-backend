import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DatabaseModule } from '../database/database.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [DatabaseModule, BadgesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
