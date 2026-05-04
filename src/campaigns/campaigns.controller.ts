import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UsersService } from '../users/users.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAllActive() {
    return this.campaignsService.findAllActive();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('pending')
  async findAllPending(@Req() req: any) {
    const localUser = await this.usersService.findBySupabaseUid(req.user.supabase_uid);
    if (!localUser || localUser.role !== 'moderator') {
      throw new ForbiddenException('Only moderators can view pending campaigns');
    }
    return this.campaignsService.findAllPending();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: any, @Body() data: CreateCampaignDto) {
    const localUser = await this.usersService.findBySupabaseUid(req.user.supabase_uid);
    if(!localUser){
      return null;
    }
    return this.campaignsService.create(localUser.id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/status')
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: 'active' | 'rejected' | 'closed') {
    const localUser = await this.usersService.findBySupabaseUid(req.user.supabase_uid);
    if (!localUser || localUser.role !== 'moderator') {
      throw new ForbiddenException('Only moderators can update campaign status');
    }
    return this.campaignsService.updateStatus(id, status);
  }
}
