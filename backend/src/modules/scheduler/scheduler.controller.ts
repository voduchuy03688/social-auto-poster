import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';

@ApiTags('Scheduler & Automation')
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('batch-generate-schedule')
  @ApiOperation({
    summary: 'Nhận danh sách Topic -> AI tự sinh bài & tạo ảnh -> Lập lịch đăng 1 bài / ngày tự động',
  })
  async batchGenerateAndSchedule(
    @Body()
    body: {
      topicsList: string[];
      intervalDays?: number;
      publishHour?: number;
      generateImages?: boolean;
      startDate?: string;
      startFromToday?: boolean;
    },
  ) {
    return this.schedulerService.batchGenerateAndSchedule(body);
  }
}
