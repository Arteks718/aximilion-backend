import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAllActive() {
    return this.campaignsService.findAllActive();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('pending')
  findAllPending(@Req() req: any) {
    const user = req.user;
    if (user.role !== 'moderator') {
      throw new ForbiddenException('Only moderators can view pending campaigns');
    }
    return this.campaignsService.findAllPending();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: any, @Body() data: any) {
    const user = req.user;
    if (user.role !== 'publisher') {
      throw new ForbiddenException('Only publishers can create campaigns');
    }
    return this.campaignsService.create(user.sub, data); // payload sub contains user ID
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/status')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: 'active' | 'rejected' | 'closed') {
    const user = req.user;
    if (user.role !== 'moderator') {
      throw new ForbiddenException('Only moderators can update campaign status');
    }
    return this.campaignsService.updateStatus(id, status);
  }
}
