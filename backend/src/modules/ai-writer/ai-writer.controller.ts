import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiWriterService } from './ai-writer.service';

@ApiTags('AI Content & Image Writer')
@Controller('ai-writer')
export class AiWriterController {
  constructor(private readonly aiWriterService: AiWriterService) {}

  @Post('generate-for-topic/:topicId')
  @ApiOperation({ summary: 'Tự động tạo bài viết AI + Ảnh AI từ Topic ID' })
  async generateForTopic(
    @Param('topicId') topicId: string,
    @Body() body: { tone?: string; customPrompt?: string; generateImage?: boolean },
  ) {
    return this.aiWriterService.generatePostForTopic(topicId, body);
  }

  @Post('generate-custom')
  @ApiOperation({ summary: 'Tạo bài viết AI trực tiếp từ chủ đề nháp' })
  async generateCustom(@Body() body: { prompt: string }) {
    const content = await this.aiWriterService.generateCustomContent(body.prompt);
    return { content };
  }

  @Post('generate-image')
  @ApiOperation({ summary: 'Tạo ảnh AI theo chủ đề/từ khóa' })
  async generateImage(@Body() body: { topicTitle: string; keywords?: string }) {
    const imageUrl = await this.aiWriterService.generateAiImage(body.topicTitle, body.keywords);
    return { imageUrl };
  }
}
