import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialAccount, SocialAccountSchema } from '../../schemas/social-account.schema';
import { Post, PostSchema } from '../../schemas/post.schema';
import { ThreadsService } from './threads.service';
import { ThreadsController } from './threads.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SocialAccount.name, schema: SocialAccountSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [ThreadsController],
  providers: [ThreadsService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
