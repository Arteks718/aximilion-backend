import { Module } from '@nestjs/common';

import { ModeratorController } from './moderator.controller';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { BadgesModule } from '../badges/badges.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [CampaignsModule, BadgesModule, UsersModule],
  controllers: [ModeratorController],
})
export class ModeratorModule {}
