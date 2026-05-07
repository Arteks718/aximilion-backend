import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('sync')
  syncUser(@Request() req: any) {
    const { supabase_uid, email, full_name } = req.user;
    return this.authService.syncSupabaseUser(supabase_uid, email, full_name);
  }
}
