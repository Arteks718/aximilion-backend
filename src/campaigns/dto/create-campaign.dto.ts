import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MilestoneDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}

export class ImageDto {
  @IsString()
  url: string;

  @IsString()
  @IsIn(['cover', 'gallery'])
  type: 'cover' | 'gallery';
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty({ message: 'Title must not be empty' })
  title: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsPositive({ message: 'Goal amount must be a positive number' })
  goalAmount: number;

  @IsOptional()
  @IsString()
  @IsIn(['USD', 'EUR', 'UAH'])
  currency?: string;

  @IsOptional()
  @IsString()
  monoJarUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];

  @IsOptional()
  @IsString()
  legalProofUrl?: string;

  @IsOptional()
  @IsString()
  financialAuditUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];
}
