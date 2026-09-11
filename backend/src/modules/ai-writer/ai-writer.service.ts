import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { Topic, TopicDocument } from '../../schemas/topic.schema';
import { Post, PostDocument } from '../../schemas/post.schema';

@Injectable()
export class AiWriterService {
  private readonly logger = new Logger(AiWriterService.name);

  constructor(
    @InjectModel(Topic.name)
    private readonly topicModel: Model<TopicDocument>,
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {}

  /**
   * Tạo prompt chuyên biệt dành riêng cho mạng xã hội Threads (Thanh lịch & Chuyên nghiệp, Không Emojis/Icons)
   */
  private buildThreadsSystemPrompt(topicTitle: string, keywords?: string, tone?: string): string {
    return `Bạn là một Chuyên Gia sáng tạo nội dung chuyên nghiệp số 1 trên Threads (Meta Threads).
Nhiệm vụ của bạn là viết một bài post Threads CỰC KỲ THU HÚT, TRUYỀN CẢM HỨNG, CHUYÊN NGHIỆP VÀ SẮC SẢN về chủ đề: "${topicTitle}".

Các yêu cầu bắt buộc:
1. Dòng đầu tiên (HOOK Line): Phải gây chú ý mạnh mẽ, ngắn gọn, súc tích, chuyên nghiệp.
2. Cấu trúc đoạn văn: Ngắn gọn, ngắt dòng thông thoáng, trình bày rõ ràng.
3. TUYỆT ĐỐI KHÔNG SỬ DỤNG BẤT KỲ EMOJI HOẶC ICON NÀO TRONG NỘI DUNG. Giữ phong cách văn bản thuần túy, sang trọng, đẳng cấp và chuyên nghiệp.
4. Nội dung (Body): Cung cấp 2-3 ý tưởng thực chiến, giá trị cao hoặc góc nhìn độc đáo, súc tích.
5. Kêu gọi tương tác (CTA Question): Dòng cuối cùng đặt 1 câu hỏi khơi gợi thảo luận cho độc giả.
6. Giới hạn độ dài: Tuyệt đối không quá 480 ký tự (chuẩn Threads API limit). Không dùng hashtag rác.
7. Ngôn ngữ: Tiếng Việt chuẩn mực, hiện đại, cuốn hút, chuyên nghiệp.

Thông tin bổ sung:
- Từ khóa quan trọng: ${keywords || 'Không có'}
- Tone giọng mong muốn: ${tone || 'Chuyên nghiệp, tinh tế, tối giản, sang trọng'}

Chỉ trả về DUY NHẤT nội dung bài viết Threads, không thêm lời chào, không thêm ngoặc kép hay giải thích.`;
  }

  /**
   * Xóa tất cả emoji/icons thừa trong văn bản
   */
  private stripEmojis(text: string): string {
    return text
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F6D0}-\u{1F6FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu,
        '',
      )
      .trim();
  }

  /**
   * Sinh nội dung bài viết bằng Gemini API
   */
  private async generateWithGemini(prompt: string, apiKey: string): Promise<string> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return this.stripEmojis(response.text().trim());
    } catch (e) {
      this.logger.error(`Lỗi Gemini API: ${e.message}`);
      throw e;
    }
  }

  /**
   * Sinh nội dung bài viết bằng OpenAI API
   */
  private async generateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Bạn là chuyên gia viết bài Threads chuyên nghiệp, sang trọng, không dùng emoji.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return this.stripEmojis(response.data.choices[0].message.content.trim());
    } catch (e) {
      const errMsg = e.response?.data?.error?.message || e.message;
      this.logger.error(`Lỗi OpenAI API (${e.response?.status || 500}): ${errMsg}`);
      throw new Error(errMsg);
    }
  }

  /**
   * Tự động sinh ảnh AI minh họa bằng OpenAI DALL-E 3 hoặc High-Res AI Generator
   */
  async generateAiImage(topicTitle: string, keywords?: string): Promise<string> {
    const openaiKey = process.env.OPENAI_API_KEY;
    const cleanPrompt = `A high quality, modern aesthetic illustration representing: "${topicTitle}". Minimalist style, vibrant color palette, social media banner format, 4k resolution. ${
      keywords ? `Keywords: ${keywords}` : ''
    }`;

    if (openaiKey && openaiKey.startsWith('sk-') && !openaiKey.includes('your_openai_api_key')) {
      try {
        this.logger.log(`Generating AI Image using OpenAI DALL-E 3 for: ${topicTitle}`);
        const res = await axios.post(
          'https://api.openai.com/v1/images/generations',
          {
            model: 'dall-e-3',
            prompt: cleanPrompt,
            n: 1,
            size: '1024x1024',
          },
          {
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
        if (res.data && res.data.data && res.data.data[0]?.url) {
          return res.data.data[0].url;
        }
      } catch (err) {
        this.logger.warn(`OpenAI DALL-E Image Error: ${err.message}. Chuyển sang AI Image Generator fallback...`);
      }
    }

    const encodedPrompt = encodeURIComponent(`modern aesthetic artwork, ${topicTitle}, minimalist digital art 4k`);
    const randomSeed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true&seed=${randomSeed}`;
  }

  private generateSmartFallback(topicTitle: string): string {
    return `Bí quyết làm chủ "${topicTitle}" dành cho người chuyên nghiệp.

Hầu hết mọi người đều gặp khó khăn ở giai đoạn đầu, nhưng nếu áp dụng 3 nguyên tắc này bạn sẽ thấy sự thay đổi rõ rệt:

1. Định hình tư duy và tập trung hoàn toàn vào giá trị cốt lõi.
2. Tối ưu hóa quy trình làm việc nhỏ mỗi ngày một cách kỷ luật.
3. Đo lường chỉ số thực tế và liên tục cải thiện.

Góc nhìn của bạn về vấn đề này như thế nào? Hãy chia sẻ suy nghĩ bên dưới.`;
  }

  async generatePostForTopic(
    topicId: string,
    options?: { tone?: string; customPrompt?: string; generateImage?: boolean },
  ): Promise<PostDocument> {
    const topic = await this.topicModel.findById(topicId);
    if (!topic) {
      throw new Error(`Không tìm thấy topic với ID ${topicId}`);
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const prompt = options?.customPrompt || this.buildThreadsSystemPrompt(topic.topicTitle, topic.keywords, options?.tone);

    let generatedContent = '';

    try {
      if (openaiKey && openaiKey.startsWith('sk-') && !openaiKey.includes('your_openai_api_key')) {
        this.logger.log(`Generating content using OpenAI API for topic: ${topic.topicTitle}`);
        generatedContent = await this.generateWithOpenAI(prompt, openaiKey);
      } else if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
        this.logger.log(`Generating content using Gemini API for topic: ${topic.topicTitle}`);
        generatedContent = await this.generateWithGemini(prompt, geminiKey);
      } else {
        this.logger.warn(`Dùng Smart Fallback Generator.`);
        generatedContent = this.generateSmartFallback(topic.topicTitle);
      }
    } catch (err) {
      this.logger.error(`AI Generation Error: ${err.message}. Chuyển sang Smart Fallback Generator...`);
      generatedContent = this.generateSmartFallback(topic.topicTitle);
    }

    let imageUrl = '';
    const shouldGenerateImage = options?.generateImage !== undefined ? options.generateImage : true;
    if (shouldGenerateImage) {
      try {
        imageUrl = await this.generateAiImage(topic.topicTitle, topic.keywords);
      } catch (imgErr) {
        this.logger.warn(`Lỗi tạo ảnh AI: ${imgErr.message}`);
        const encodedPrompt = encodeURIComponent(`modern aesthetic artwork, ${topic.topicTitle}, minimalist digital art 4k`);
        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
      }
    }

    const post = new this.postModel({
      topicId: topic._id,
      content: generatedContent,
      aiPrompt: prompt,
      imageUrl: imageUrl || null,
      status: 'DRAFT',
      scheduledAt: new Date(Date.now() + 3600000),
    });

    const savedPost = await post.save();
    topic.status = 'GENERATED';
    await topic.save();

    return savedPost;
  }

  async generateCustomContent(promptText: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const fullPrompt = this.buildThreadsSystemPrompt(promptText);

    try {
      if (openaiKey && openaiKey.startsWith('sk-') && !openaiKey.includes('your_openai_api_key')) {
        return await this.generateWithOpenAI(fullPrompt, openaiKey);
      } else if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
        return await this.generateWithGemini(fullPrompt, geminiKey);
      }
    } catch (e) {
      this.logger.warn(`Lỗi API Key OpenAI/Gemini: ${e.message}. Dùng Smart Fallback Generator.`);
    }

    return this.generateSmartFallback(promptText);
  }
}
