import { IsUUID, IsInt, IsString, IsOptional, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsUUID()
  campaignId: string;

  /** Amount in the smallest currency unit (e.g. cents for USD) */
  @IsInt()
  @Min(50)
  amount: number;

  @IsString()
  @IsOptional()
  currency: string = 'usd';

  @IsString()
  @IsOptional()
  userId: string | null;
}
