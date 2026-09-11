import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PostsService } from './posts.service';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả bài viết (Lọc theo status nếu có)' })
  async getPosts(@Query('status') status?: string) {
    return this.postsService.getAllPosts(status);
  }

  @Get('published')
  @ApiOperation({ summary: 'Lấy danh sách các bài ĐÃ ĐĂNG THÀNH CÔNG lên Threads' })
  async getPublishedPosts() {
    return this.postsService.getPublishedPosts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết 1 bài viết theo ID' })
  async getPostById(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo thủ công 1 bài viết mới' })
  async createPost(
    @Body()
    body: {
      topicId?: string;
      content: string;
      imageUrl?: string;
      scheduledAt?: string;
    },
  ) {
    return this.postsService.createPost({
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bài viết' })
  async updatePost(
    @Param('id') id: string,
    @Body()
    body: {
      content?: string;
      imageUrl?: string;
      status?: string;
      scheduledAt?: string;
    },
  ) {
    return this.postsService.updatePost(id, {
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bài viết' })
  async deletePost(@Param('id') id: string) {
    await this.postsService.deletePost(id);
    return { success: true };
  }
}
