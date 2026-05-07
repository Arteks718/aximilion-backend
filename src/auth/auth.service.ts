import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  async syncSupabaseUser(sub: string, email: string, fullName: string | null) {
    return this.usersService.syncSupabaseUser(sub, email, fullName);
  }
}
