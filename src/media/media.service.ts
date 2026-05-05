import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

@Injectable()
export class MediaService {
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_PUBLISHABLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing from environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadFile(file: Express.Multer.File, campaignId: string, fileType: 'gallery' | 'cover' | 'legal_proof' | 'financial_audit') {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${campaignId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('campaign-media')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new InternalServerErrorException(`Failed to upload file: ${uploadError.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from('campaign-media')
      .getPublicUrl(fileName);

    const [newMediaRecord] = await this.db.insert(schema.media).values({
      campaignId,
      fileType,
      supabaseUrl: publicUrlData.publicUrl,
    }).returning();

    return newMediaRecord;
  }
}
