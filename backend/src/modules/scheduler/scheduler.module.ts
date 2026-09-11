import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Topic, TopicSchema } from '../../schemas/topic.schema';
import { Post, PostSchema } from '../../schemas/post.schema';
import { AiWriterModule } from '../ai-writer/ai-writer.module';
import { ThreadsModule } from '../threads/threads.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Topic.name, schema: TopicSchema },
      { name: Post.name, schema: PostSchema },
    ]),
    AiWriterModule,
    ThreadsModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
