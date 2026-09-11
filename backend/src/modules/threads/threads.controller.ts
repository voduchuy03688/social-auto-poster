import { Controller, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ThreadsService } from './threads.service';

@ApiTags('Threads Publishing')
@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post('publish/:postId')
  @ApiOperation({ summary: 'Đăng trực tiếp bài viết lên Threads ngay lập tức' })
  async publishPost(
    @Param('postId') postId: string,
    @Body() body: { accountId?: string },
  ) {
    return this.threadsService.publishPostToThreads(postId, body.accountId);
  }
}
