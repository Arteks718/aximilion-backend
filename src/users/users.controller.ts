import { Controller, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
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
}
