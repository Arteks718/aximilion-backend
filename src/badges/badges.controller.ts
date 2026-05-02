import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { BadgesService } from './badges.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  getMyBadges(@Req() req: any) {
    return this.badgesService.getMyBadges(req.user.sub);
  }
}
