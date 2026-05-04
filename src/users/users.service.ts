import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    return user;
  }

  async create(data: any) {
    const [newUser] = await this.db
      .insert(schema.users)
      .values({
        email: data.email,
        role: 'registered',
        authProvider: 'local',
      })
      .returning();
    return newUser;
  }
  async syncSupabaseUser(supabaseUid: string, email: string) {
    let user = await this.db.query.users.findFirst({
      where: eq(schema.users.supabaseUid, supabaseUid),
    });

    if (!user) {
      const [newUser] = await this.db
        .insert(schema.users)
        .values({
          email: email,
          supabaseUid: supabaseUid,
          role: 'registered',
          authProvider: 'local',
        })
        .returning();
      user = newUser;
    }

    return user;
  }
}
