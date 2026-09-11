import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { AiWriterModule } from './modules/ai-writer/ai-writer.module';
import { ThreadsModule } from './modules/threads/threads.module';
import { PostsModule } from './modules/posts/posts.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/social_auto_poster',
      }),
    }),
    AiWriterModule,
    ThreadsModule,
    PostsModule,
    AccountsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
