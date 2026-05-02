import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.query.categories.findMany();
  }
}
