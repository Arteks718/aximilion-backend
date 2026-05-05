import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { DatabaseModule } from '../database/database.module';
import { BadgesModule } from '../badges/badges.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [DatabaseModule, BadgesModule, HttpModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
