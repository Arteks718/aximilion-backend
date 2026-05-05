import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
