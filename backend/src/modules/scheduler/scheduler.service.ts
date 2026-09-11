import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Topic, TopicDocument } from '../../schemas/topic.schema';
import { Post, PostDocument } from '../../schemas/post.schema';
import { AiWriterService } from '../ai-writer/ai-writer.service';
import { ThreadsService } from '../threads/threads.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectModel(Topic.name)
    private readonly topicModel: Model<TopicDocument>,
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
    private readonly aiWriterService: AiWriterService,
    private readonly threadsService: ThreadsService,
  ) {}

  /**
   * Cron Job chạy tự động mỗi phút kiểm tra các bài viết SCHEDULED đến giờ đăng
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPostsCron() {
    const now = new Date();
    const duePosts = await this.postModel
      .find({
        status: 'SCHEDULED',
        scheduledAt: { $lte: now },
      })
      .exec();

    if (duePosts.length === 0) {
      return;
    }

    this.logger.log(`⏰ [CRON] Tìm thấy ${duePosts.length} bài viết đến giờ đăng...`);

    for (const post of duePosts) {
      try {
        this.logger.log(`🚀 [CRON] Đang tiến hành đăng tự động bài viết ID ${post._id}...`);
        await this.threadsService.publishPostToThreads(post._id.toString());
        this.logger.log(`🎉 [CRON] Đã đăng bài tự động thành công cho Post ID ${post._id}`);
      } catch (err) {
        this.logger.error(`❌ [CRON] Lỗi khi tự động đăng bài ${post._id}: ${err.message}`);
      }
    }
  }

  /**
   * Nhận danh sách Topic truyền vào -> AI tự sinh nội dung & tạo ảnh -> Lên lịch 1 bài/ngày
   */
  async batchGenerateAndSchedule(dto: {
    topicsList: string[];
    intervalDays?: number;
    publishHour?: number;
    generateImages?: boolean;
    startDate?: string;
    startFromToday?: boolean;
  }): Promise<{ createdTopicsCount: number; scheduledPostsCount: number; posts: PostDocument[] }> {
    const topicsList = dto.topicsList.filter((t) => t && t.trim().length > 0);
    const intervalDays = dto.intervalDays || 1;
    const publishHour = dto.publishHour !== undefined ? dto.publishHour : 9;
    const shouldGenerateImages = dto.generateImages !== undefined ? dto.generateImages : true;
    const startFromToday = dto.startFromToday !== undefined ? dto.startFromToday : true;

    this.logger.log(
      `🚀 Tạo hàng loạt ${topicsList.length} bài viết MongoDB với lịch đăng ${intervalDays} ngày / bài lúc ${publishHour}:00...`,
    );

    const createdPosts: PostDocument[] = [];
    const baseDate = dto.startDate ? new Date(dto.startDate) : new Date();

    for (let i = 0; i < topicsList.length; i++) {
      const topicTitle = topicsList[i].trim();

      // 1. Lưu Topic vào MongoDB
      const topic = await this.topicModel.create({
        topicTitle: topicTitle,
        status: 'GENERATED',
      });

      // 2. Gọi AI sinh nội dung & tạo ảnh (Không emoji)
      const post = await this.aiWriterService.generatePostForTopic(topic._id.toString(), {
        generateImage: shouldGenerateImages,
      });

      // 3. Tính toán thời gian hẹn giờ (Ngày bắt đầu + i * intervalDays)
      const scheduleTime = new Date(baseDate);
      const dayOffset = startFromToday ? i * intervalDays : (i + 1) * intervalDays;
      scheduleTime.setDate(baseDate.getDate() + dayOffset);
      scheduleTime.setHours(publishHour, 0, 0, 0);

      // Nếu lịch hẹn là hôm nay nhưng giờ hẹn đã qua, đặt giờ là thời gian hiện tại
      if (scheduleTime.getTime() < Date.now()) {
        scheduleTime.setTime(Date.now() + (i + 1) * 60 * 1000); // 1 phút nữa
      }

      post.status = 'SCHEDULED';
      post.scheduledAt = scheduleTime;
      await post.save();

      createdPosts.push(post);
      this.logger.log(
        `📅 Đã hẹn giờ bài đăng [${i + 1}/${topicsList.length}]: "${topicTitle.slice(0, 30)}..." vào ${scheduleTime.toLocaleString('vi-VN')}`,
      );
    }

    return {
      createdTopicsCount: topicsList.length,
      scheduledPostsCount: createdPosts.length,
      posts: createdPosts,
    };
  }
}
