import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, sum, countDistinct, and, desc, sql } from 'drizzle-orm';
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

  async getDashboardStats(supabaseUid: string) {
    // 1. totalDonated & uniqueCampaignsCount
    const [statsResult] = await this.db
      .select({
        totalDonated: sum(schema.payments.amount),
        uniqueCampaigns: countDistinct(schema.payments.campaignId),
      })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.donorId, supabaseUid),
          eq(schema.payments.status, 'success')
        )
      );
      
    const totalDonatedCents = parseInt(statsResult?.totalDonated || '0', 10);
    const totalDonated = totalDonatedCents / 100;
    const uniqueCampaignsCount = statsResult?.uniqueCampaigns || 0;

    // 2. streakDays
    const paymentDates = await this.db
      .select({
        date: sql<Date>`date_trunc('day', ${schema.payments.createdAt})`
      })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.donorId, supabaseUid),
          eq(schema.payments.status, 'success')
        )
      )
      .groupBy(sql`date_trunc('day', ${schema.payments.createdAt})`)
      .orderBy(desc(sql`date_trunc('day', ${schema.payments.createdAt})`));

    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (paymentDates.length > 0) {
      let lastDate = new Date(paymentDates[0].date);
      lastDate.setHours(0, 0, 0, 0);
      const diffFromToday = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffFromToday <= 1) {
        streakDays = 1;
        for (let i = 1; i < paymentDates.length; i++) {
          const current = new Date(paymentDates[i].date);
          current.setHours(0,0,0,0);
          const prev = new Date(paymentDates[i-1].date);
          prev.setHours(0,0,0,0);
          const gap = Math.floor((prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
          if (gap === 1) streakDays++;
          else break;
        }
      }
    }

    // 3. badges
    const allBadgesList = await this.db.query.badges.findMany();
    
    const userBadgesQuery = await this.db
      .select({
        id: schema.badges.id,
      })
      .from(schema.userBadges)
      .innerJoin(schema.badges, eq(schema.userBadges.badgeId, schema.badges.id))
      .innerJoin(schema.users, eq(schema.userBadges.userId, schema.users.id))
      .where(eq(schema.users.supabaseUid, supabaseUid));

    const earnedBadgeIds = userBadgesQuery.map(b => b.id);

    const badgesData = allBadgesList.map(b => ({
      id: b.id,
      name: b.name,
      icon_url: b.iconUrl,
      criteria_type: b.criteriaType,
      criteria_value: b.criteriaValue,
      active: earnedBadgeIds.includes(b.id)
    }));

    // 4. recentlySupported
    const recentCampaigns = await this.db
      .select({
        id: schema.campaigns.id,
        title: schema.campaigns.title,
        goalAmount: schema.campaigns.goalAmount,
        collectedInternal: schema.campaigns.collectedInternal,
        images: schema.campaigns.images,
        lastPayment: sql<Date>`max(${schema.payments.createdAt})`,
      })
      .from(schema.payments)
      .innerJoin(schema.campaigns, eq(schema.payments.campaignId, schema.campaigns.id))
      .where(
        and(
          eq(schema.payments.donorId, supabaseUid),
          eq(schema.payments.status, 'success')
        )
      )
      .groupBy(schema.campaigns.id)
      .orderBy(desc(sql`max(${schema.payments.createdAt})`))
      .limit(3);

    const recentlySupported = recentCampaigns.map(c => {
      let coverUrl = null;
      if (c.images && Array.isArray(c.images)) {
        const cover = c.images.find((img: any) => img.type === 'cover');
        if (cover) coverUrl = cover.url;
        else if (c.images.length > 0) coverUrl = c.images[0].url;
      }
      
      const goal = parseFloat(c.goalAmount);
      const collected = parseFloat(c.collectedInternal);
      const fundedPercent = goal > 0 ? Math.round((collected / goal) * 100) : 0;

      return {
        id: c.id,
        title: c.title,
        fundedPercent,
        imageUrl: coverUrl
      };
    });

    return {
      totalDonated,
      uniqueCampaignsCount,
      streakDays,
      badges: badgesData,
      recentlySupported
    };
  }

  async getDonations(supabaseUid: string, limit: number = 5, offset: number = 0) {
    const results = await this.db
      .select({
        id: schema.payments.id,
        date: schema.payments.createdAt,
        campaign: schema.campaigns.title,
        amount: schema.payments.amount,
        status: schema.payments.status,
      })
      .from(schema.payments)
      .innerJoin(schema.campaigns, eq(schema.payments.campaignId, schema.campaigns.id))
      .where(eq(schema.payments.donorId, supabaseUid))
      .orderBy(desc(schema.payments.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: countDistinct(schema.payments.id) })
      .from(schema.payments)
      .where(eq(schema.payments.donorId, supabaseUid));

    return {
      data: results.map(r => ({
        ...r,
        amount: r.amount / 100
      })),
      total: Number(total),
    };
  }
}
