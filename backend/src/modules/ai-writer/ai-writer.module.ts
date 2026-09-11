import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Topic, TopicSchema } from '../../schemas/topic.schema';
import { Post, PostSchema } from '../../schemas/post.schema';
import { AiWriterService } from './ai-writer.service';
import { AiWriterController } from './ai-writer.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Topic.name, schema: TopicSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [AiWriterController],
  providers: [AiWriterService],
  exports: [AiWriterService],
})
export class AiWriterModule {}
