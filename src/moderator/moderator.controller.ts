import { Controller, Get, Patch, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CampaignsService } from '../campaigns/campaigns.service';
import { BadgesService } from '../badges/badges.service';

@Controller('moderator')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('moderator')
export class ModeratorController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly badgesService: BadgesService
  ) {}

  @Get('campaigns/pending')
  getPendingCampaigns() {
    return this.campaignsService.findAllPending();
  }

  @Patch('campaigns/:id/status')
  updateCampaignStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'rejected' | 'closed'
  ) {
    return this.campaignsService.updateStatus(id, status);
  }

  @Post('badges')
  @UseInterceptors(FileInterceptor('icon'))
  createBadge(@UploadedFile() file: Express.Multer.File, @Body() data: any) {
    return this.badgesService.createBadge(data, file);
  }
}
