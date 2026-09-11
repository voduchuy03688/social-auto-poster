import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from '../../schemas/post.schema';
import { Topic, TopicSchema } from '../../schemas/topic.schema';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Topic.name, schema: TopicSchema },
    ]),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
