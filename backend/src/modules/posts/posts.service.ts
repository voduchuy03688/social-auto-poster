import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../../schemas/post.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {}

  async getAllPosts(status?: string): Promise<PostDocument[]> {
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    return this.postModel
      .find(filter)
      .populate('topicId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPublishedPosts(): Promise<PostDocument[]> {
    return this.postModel
      .find({ status: 'PUBLISHED' })
      .populate('topicId')
      .sort({ publishedAt: -1, createdAt: -1 })
      .exec();
  }

  async getPostById(id: string): Promise<PostDocument> {
    const post = await this.postModel.findById(id).populate('topicId').exec();
    if (!post) {
      throw new NotFoundException(`Không tìm thấy bài viết với ID ${id}`);
    }
    return post;
  }

  async createPost(dto: {
    topicId?: string;
    content: string;
    imageUrl?: string;
    scheduledAt?: Date;
  }): Promise<PostDocument> {
    const post = new this.postModel({
      ...dto,
      status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT',
    });
    return post.save();
  }

  async updatePost(
    id: string,
    dto: {
      content?: string;
      imageUrl?: string;
      status?: string;
      scheduledAt?: Date;
    },
  ): Promise<PostDocument> {
    const updateData: any = { ...dto };
    if (dto.scheduledAt && (!dto.status || dto.status === 'DRAFT')) {
      updateData.status = 'SCHEDULED';
    }
    const post = await this.postModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!post) {
      throw new NotFoundException(`Không tìm thấy bài viết với ID ${id}`);
    }
    return post;
  }

  async deletePost(id: string): Promise<void> {
    await this.postModel.findByIdAndDelete(id);
  }
}
