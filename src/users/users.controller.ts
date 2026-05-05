import { Controller, Get, Patch, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateProfile(@Request() req:any, @Body() body: any) {
    const userId = body.userId; // DB user ID
    const supabaseUid = req.user.supabase_uid;

    return this.usersService.updateProfile(userId, {
      ...body,
      supabaseUid,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(@Request() req: any, @Body() body: { newPassword: string }) {
    const supabaseUid = req.user.supabase_uid;
    return this.usersService.changePassword(supabaseUid, body.newPassword);
  }
  @UseGuards(AuthGuard('jwt'))
  @Get('me/dashboard-stats')
  async getDashboardStats(@Request() req: any) {
    const supabaseUid = req.user.supabase_uid;
    return this.usersService.getDashboardStats(supabaseUid);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/donations')
  async getDonations(@Request() req: any, @Query('limit') limitStr?: string, @Query('offset') offsetStr?: string) {
    const supabaseUid = req.user.supabase_uid;
    const limit = limitStr ? parseInt(limitStr, 10) : 5;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    return this.usersService.getDonations(supabaseUid, limit, offset);
  }
}
