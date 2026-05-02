import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  categoryId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  goalAmount: number;

  @IsOptional()
  @IsString()
  monoJarUrl?: string;
}
