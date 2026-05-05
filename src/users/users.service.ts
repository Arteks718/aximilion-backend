import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class UsersService {
  private supabase: SupabaseClient;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SECRET_KEY || ''
    );
  }

  async findByEmail(email: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    return user;
  }

  async findBySupabaseUid(supabaseUid: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.supabaseUid, supabaseUid),
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

  async updateProfile(userId: string, data: { fullName?: string; email?: string; phone?: string; dob?: Date; gender?: string; supabaseUid: string }) {
    // 1. Update Supabase Auth if necessary
    const updates: any = {};
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    if (data.fullName) updates.user_metadata = { full_name: data.fullName };

    if (Object.keys(updates).length > 0) {
      console.log((data.supabaseUid))
      const { error } = await this.supabase.auth.admin.updateUserById(data.supabaseUid, updates);
      if (error) {
        throw new Error(`Failed to update Supabase user: ${error.message}`);
      }
    }

    // 2. Update Drizzle database
    const dbUpdates: any = {};
    if (data.email) dbUpdates.email = data.email;
    if (data.phone) dbUpdates.phone = data.phone;
    if (data.dob) dbUpdates.dateOfBirth = data.dob;
    if (data.gender) dbUpdates.gender = data.gender;
    if (data.fullName) dbUpdates.fullName = data.fullName;
    dbUpdates.updatedAt = new Date();

    const [updatedUser] = await this.db
      .update(schema.users)
      .set(dbUpdates)
      .where(eq(schema.users.id, userId))
      .returning();

    return updatedUser;
  }

  async changePassword(supabaseUid: string, newPassword: string) {
    const { error } = await this.supabase.auth.admin.updateUserById(supabaseUid, {
      password: newPassword,
    });
    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
    return { success: true };
  }
}
