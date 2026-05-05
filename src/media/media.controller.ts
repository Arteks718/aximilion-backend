import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';

@Controller('media')
@UseGuards(AuthGuard('jwt'))
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('campaignId') campaignId: string,
    @Body('fileType') fileType: 'gallery' | 'cover' | 'legal_proof' | 'financial_audit'
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!campaignId || !fileType) {
      throw new BadRequestException('campaignId and fileType are required');
    }

    return this.mediaService.uploadFile(file, campaignId, fileType);
  }
}
