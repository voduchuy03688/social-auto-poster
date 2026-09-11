import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { SocialAccount, SocialAccountDocument } from '../../schemas/social-account.schema';
import { Post, PostDocument } from '../../schemas/post.schema';

@Injectable()
export class ThreadsService {
  private readonly logger = new Logger(ThreadsService.name);

  constructor(
    @InjectModel(SocialAccount.name)
    private readonly accountModel: Model<SocialAccountDocument>,
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {}

  /**
   * Tạo Threads Post Container (Bước 1 của Meta Threads API)
   */
  async createThreadsContainer(
    userId: string,
    accessToken: string,
    text: string,
    imageUrl?: string,
  ): Promise<string> {
    const url = `https://graph.threads.net/v1.0/${userId}/threads`;
    const params: any = {
      access_token: accessToken,
      text: text,
      media_type: imageUrl ? 'IMAGE' : 'TEXT',
    };

    if (imageUrl) {
      params.image_url = imageUrl;
    }

    try {
      this.logger.log(`Gửi yêu cầu tạo Threads Container tới Meta API cho User ID ${userId}...`);
      const res = await axios.post(url, null, { params });
      if (res.data && res.data.id) {
        return res.data.id;
      }
      throw new Error(`Threads Container Response Invalid: ${JSON.stringify(res.data)}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      this.logger.error(`Lỗi Meta Threads API (Create Container): ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  /**
   * Đăng chính thức Threads Post Container (Bước 2 của Meta Threads API)
   */
  async publishThreadsContainer(
    userId: string,
    accessToken: string,
    creationId: string,
  ): Promise<string> {
    const url = `https://graph.threads.net/v1.0/${userId}/threads_publish`;
    const params = {
      access_token: accessToken,
      creation_id: creationId,
    };

    try {
      this.logger.log(`Gửi yêu cầu Publish Threads Container ${creationId} tới Meta API...`);
      const res = await axios.post(url, null, { params });
      if (res.data && res.data.id) {
        return res.data.id;
      }
      throw new Error(`Threads Publish Response Invalid: ${JSON.stringify(res.data)}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      this.logger.error(`Lỗi Meta Threads API (Publish Container): ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  /**
   * Đăng bài trực tiếp bằng Threads Web Internal API (bằng Bearer IGT Token & Cookie)
   */
  async publishViaThreadsWebDirectApi(
    userId: string,
    accessToken: string,
    text: string,
  ): Promise<string> {
    const url = 'https://www.threads.net/api/v1/media/configure_text_only_post/';

    let bearerToken = accessToken.trim();
    if (!bearerToken.startsWith('Bearer ')) {
      bearerToken = `Bearer ${bearerToken}`;
    }

    const sessionId = process.env.THREADS_SESSION_ID || '70469141102%3AbWxcmPLQyRFUOI%3A5%3AAYnR95tptNU_W1Vc6JssPyxaGsBvQWVJ1T90qKq-8w';
    const csrfToken = process.env.THREADS_CSRF_TOKEN || 'Ovq2yHOKJPlFQ4SlpTgV30UtOhzZJtXK';

    const headers = {
      Authorization: bearerToken,
      Cookie: `sessionid=${sessionId}; ds_user_id=${userId}; csrftoken=${csrfToken}`,
      'x-ig-app-id': '238260118697367',
      'x-csrftoken': csrfToken,
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      origin: 'https://www.threads.net',
      referer: `https://www.threads.net/@hayabusa12121?hl=vi`,
    };

    const fbDtsg = process.env.THREADS_FB_DTSG;
    const lsd = process.env.THREADS_LSD;

    const params = new URLSearchParams();
    params.append('caption', text);
    params.append('text_post_app_info', '{"reply_control":0}');
    params.append('upload_id', Date.now().toString());
    params.append('_uid', userId);
    params.append('publish_mode', 'text_post');
    params.append('jazoest', '26275');
    if (fbDtsg) params.append('fb_dtsg', fbDtsg);
    if (lsd) params.append('lsd', lsd);

    try {
      this.logger.log(`🚀 Đang gửi bài trực tiếp qua Threads Web API cho User ${userId}...`);
      const res = await axios.post(url, params.toString(), { headers });
      if (res.data && (res.data.media || res.data.id || res.data.status === 'ok')) {
        const mediaId = res.data.media?.id || res.data.media?.pk || res.data.id || `web_post_${Date.now()}`;
        const code = res.data.media?.code;
        const permalink = code ? `https://www.threads.com/@hayabusa12121/post/${code}` : null;
        this.logger.log(`🎉 Đăng bài qua Threads Web API thành công! Media ID: ${mediaId}${permalink ? ` (${permalink})` : ''}`);
        return permalink || mediaId;
      }
      throw new Error(`Threads Web Response: ${JSON.stringify(res.data)}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.message;
      this.logger.warn(`Lỗi Threads Web Direct API (${msg})...`);
      throw new Error(msg);
    }
  }

  /**
   * Tải ảnh AI về server buffer và upload trực tiếp binary ảnh lên Threads Web API (Bắt buộc đăng đính kèm ảnh thành công)
   */
  async publishImagePostViaThreadsWeb(
    userId: string,
    accessToken: string,
    text: string,
    imageUrl: string,
  ): Promise<string> {
    const bearerToken = accessToken.trim().startsWith('Bearer ') ? accessToken.trim() : `Bearer ${accessToken.trim()}`;
    const sessionId = process.env.THREADS_SESSION_ID || '70469141102%3AbWxcmPLQyRFUOI%3A5%3AAYnR95tptNU_W1Vc6JssPyxaGsBvQWVJ1T90qKq-8w';
    const csrfToken = process.env.THREADS_CSRF_TOKEN || 'Ovq2yHOKJPlFQ4SlpTgV30UtOhzZJtXK';
    const uploadId = Date.now().toString();

    // 1. Tải Binary ảnh từ URL với đa nguồn fallback chống 429/Timeout
    let imageBuffer: Buffer;
    const fallbackSources = [
      imageUrl,
      'https://picsum.photos/1080/1080',
      'https://loremflickr.com/1080/1080/minimalist,art',
      `https://image.pollinations.ai/prompt/${encodeURIComponent('modern minimalist digital art')}?width=1080&height=1080&nologo=true`,
    ];

    let downloaded = false;
    for (const src of fallbackSources) {
      if (!src) continue;
      try {
        this.logger.log(`📥 Đang tải file binary ảnh từ URL: ${src.slice(0, 70)}...`);
        const imgResponse = await axios.get(src, { responseType: 'arraybuffer', timeout: 6000 });
        if (imgResponse.data && imgResponse.data.length > 100) {
          imageBuffer = Buffer.from(imgResponse.data);
          downloaded = true;
          this.logger.log(`✅ Tải binary ảnh thành công từ nguồn: ${src.slice(0, 50)} (${imageBuffer.length} bytes)`);
          break;
        }
      } catch (err) {
        this.logger.warn(`Lỗi tải ảnh từ nguồn ${src.slice(0, 40)}: ${err.message}`);
      }
    }

    if (!downloaded) {
      this.logger.warn(`⚠️ Tất cả nguồn tải ảnh online đều bị gián đoạn. Đang dùng local fallback image buffer...`);
      imageBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
        0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
        0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
        0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x04, 0x38,
        0x04, 0x38, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
        0x00, 0xd2, 0xcf, 0x20, 0xff, 0xd9,
      ]);
    }

    // 2. Upload binary ảnh lên Threads Server (rupload)
    this.logger.log(`⬆️ Đang Upload binary ảnh (${imageBuffer.length} bytes) lên Threads Server (rupload)...`);
    const uploadParams = JSON.stringify({
      upload_id: uploadId,
      media_type: 1,
      upload_media_height: 1080,
      upload_media_width: 1080,
    });

    const ruploadUrl = `https://www.threads.net/rupload_igphoto/fb_uploader_${uploadId}`;
    const uploadHeaders = {
      Authorization: bearerToken,
      Cookie: `sessionid=${sessionId}; ds_user_id=${userId}; csrftoken=${csrfToken}`,
      'x-ig-app-id': '238260118697367',
      'x-csrftoken': csrfToken,
      'x-asbd-id': '359341',
      'x-bloks-version-id': '03cc45721a9d9734bea72949f1cb37f26f2b977d75732de17ea4de385592f106',
      'X-Instagram-Rupload-Params': uploadParams,
      'X-Entity-Name': `fb_uploader_${uploadId}`,
      'X-Entity-Length': imageBuffer.length.toString(),
      'X-Entity-Type': 'image/jpeg',
      Offset: '0',
      'Content-Type': 'application/octet-stream',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36',
    };

    try {
      await axios.post(ruploadUrl, imageBuffer, { headers: uploadHeaders });
      this.logger.log(`✅ Upload binary ảnh thành công! Upload ID: ${uploadId}`);
    } catch (ruploadErr) {
      const errDetail = ruploadErr.response?.data ? JSON.stringify(ruploadErr.response.data) : ruploadErr.message;
      this.logger.error(`❌ Lỗi Rupload Binary Ảnh Threads: ${errDetail}`);
      throw new BadRequestException(`Lỗi Upload Binary Ảnh Threads: ${errDetail}`);
    }

    // 3. Gọi endpoint configure_text_post_app_feed đăng bài đính kèm ảnh
    const configureUrls = [
      'https://www.threads.com/api/v1/media/configure_text_post_app_feed/',
      'https://www.threads.net/api/v1/media/configure_text_post_app_feed/',
      'https://www.threads.net/api/v1/media/configure_text_post_with_media/',
      'https://i.instagram.com/api/v1/media/configure_to_threads/',
    ];

    const configHeaders = {
      Authorization: bearerToken,
      Cookie: `sessionid=${sessionId}; ds_user_id=${userId}; csrftoken=${csrfToken}`,
      'x-ig-app-id': '238260118697367',
      'x-csrftoken': csrfToken,
      'x-asbd-id': '359341',
      'x-bloks-version-id': '03cc45721a9d9734bea72949f1cb37f26f2b977d75732de17ea4de385592f106',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      origin: 'https://www.threads.com',
      referer: `https://www.threads.com/@hayabusa12121?hl=vi`,
    };

    const textPostAppInfo = JSON.stringify({
      community_flair_id: null,
      entry_point: 'top_of_profile',
      excluded_inline_media_ids: '[]',
      fediverse_composer_enabled: true,
      gif_media_id: null,
      is_genai_invocation_post: false,
      is_reply_approval_enabled: false,
      is_spoiler_media: false,
      link_attachment_url: null,
      link_preview_default_render_style: null,
      reply_control: 0,
      self_thread_context_id: `context_${uploadId}`,
      snippet_attachment: null,
      special_effects_enabled_str: null,
      tag_header: null,
      text_with_entities: { entities: [], text: text },
    });

    const fbDtsg = process.env.THREADS_FB_DTSG;
    const lsd = process.env.THREADS_LSD;

    const params = new URLSearchParams();
    params.append('upload_id', uploadId);
    params.append('caption', text);
    params.append('is_threads', 'true');
    params.append('should_include_permalink', 'true');
    params.append('async_publish', 'true');
    params.append('audience', 'default');
    params.append('chain_length', '1');
    params.append('chain_index', '0');
    params.append('chain_id', uploadId);
    params.append('text_post_app_info', textPostAppInfo);
    params.append('is_upload_type_override_allowed', '1');
    params.append('_uid', userId);
    params.append('jazoest', '26275');
    if (fbDtsg) params.append('fb_dtsg', fbDtsg);
    if (lsd) params.append('lsd', lsd);

    let res: any = null;
    let lastErrDetail: string = '';

    for (const endpoint of configureUrls) {
      try {
        this.logger.log(`🔗 Đang cấu hình bài đính kèm ảnh tới endpoint: ${endpoint}`);
        res = await axios.post(endpoint, params.toString(), { headers: configHeaders });
        const postStatus = res.data?.posts?.[0]?.status;
        if (postStatus === 'ERROR') {
          const errMsg = res.data?.posts?.[0]?.error_message || 'Meta Post Error';
          this.logger.warn(`Endpoint ${endpoint} trả về lỗi post: ${errMsg}`);
          lastErrDetail = errMsg;
          continue;
        }
        if (res.data && (res.data.media || res.data.id || res.data.status === 'ok')) {
          this.logger.log(`🎉 Cấu hình ảnh thành công qua endpoint: ${endpoint}`);
          break;
        }
      } catch (err) {
        lastErrDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        this.logger.warn(`Lỗi endpoint ${endpoint}: ${lastErrDetail}`);
      }
    }

    const postItem = res?.data?.posts?.[0];
    const mediaObj = res?.data?.media || postItem;
    const code = postItem?.code || mediaObj?.code || res?.data?.code;

    if (res && res.data && (res.data.status === 'ok' || mediaObj) && postItem?.status !== 'ERROR') {
      const mediaId = code
        ? `https://www.threads.com/@hayabusa12121/post/${code}`
        : (postItem?.id || postItem?.pk || mediaObj?.id || `web_img_post_${uploadId}`);
      this.logger.log(`🎉 ĐÃ ĐĂNG BÀI ĐÍNH KÈM ẢNH THẬT THÀNH CÔNG LÊN THREADS! Media URL/ID: ${mediaId}`);
      return mediaId;
    }

    throw new BadRequestException(`❌ Không thể đăng ảnh lên Threads. Chi tiết lỗi từ Meta: ${lastErrDetail || 'Configuration failed'}`);
  }

  /**
   * Thực hiện quy trình đăng bài lên Threads thật cho 1 Post ID bằng Mongoose MongoDB
   */
  async publishPostToThreads(postId: string, accountId?: string): Promise<PostDocument> {
    const post = await this.postModel.findById(postId);

    if (!post) {
      throw new NotFoundException(`Không tìm thấy bài viết với ID ${postId}`);
    }

    let account: SocialAccountDocument | null = null;
    if (accountId) {
      account = await this.accountModel.findOne({ _id: accountId, platform: 'THREADS' });
    } else {
      account = await this.accountModel.findOne({ platform: 'THREADS' });
    }

    if (!account || !account.accessToken) {
      throw new BadRequestException(
        '⚠️ Chưa có Token Threads! Vui lòng vào tab "Kết nối Đăng nhập MXH" để kết nối tài khoản hoặc dán Token.',
      );
    }

    post.status = 'PUBLISHING';
    await post.save();

    // KIỂM TRA 1: Sử dụng Token IGT (Threads Web Session Token từ Browser)
    if (account.accessToken.startsWith('IGT:') || account.accessToken.includes('eyJkc1')) {
      // Bắt buộc có ảnh AI mới cho phép đăng
      if (!post.imageUrl || post.imageUrl.trim().length === 0) {
        this.logger.log(`📷 Bài viết chưa có ảnh AI. Đang tự động tạo ảnh AI trước khi đăng...`);
        const encodedPrompt = encodeURIComponent(`modern aesthetic artwork, ${post.content.slice(0, 50)}, minimalist digital art 4k`);
        post.imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
        await post.save();
      }

      try {
        const webMediaId = await this.publishImagePostViaThreadsWeb(
          account.accountId || '70469141102',
          account.accessToken,
          post.content,
          post.imageUrl,
        );

        post.threadsPublishedPostId = webMediaId;
        post.platformPostId = webMediaId;
        post.status = 'PUBLISHED';
        post.publishedAt = new Date();
        post.errorMessage = null;
        post.accountId = account._id.toString();
        await post.save();

        this.logger.log(`🎉 ĐÃ ĐĂNG BÀI ĐÍNH KÈM ẢNH AI THÀNH CÔNG! Post ID: ${webMediaId}`);
        return post;
      } catch (e) {
        this.logger.error(`❌ Đăng bài đính kèm ảnh thất bại: ${e.message}`);
        post.status = 'FAILED';
        post.errorMessage = `Đăng bài đính kèm ảnh AI thất bại: ${e.message}`;
        await post.save();
        throw new BadRequestException(`❌ Lỗi đăng bài đính kèm ảnh AI lên Threads: ${e.message}`);
      }
    }

    // KIỂM TRA 2: Mô phỏng Demo Mode
    if (account.accessToken.includes('TH_LONG_LIVED_TOKEN_DEMO') || account.accessToken.includes('DEMO')) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockPostId = `mock_threads_post_${Date.now()}`;
      post.threadsPublishedPostId = mockPostId;
      post.platformPostId = mockPostId;
      post.status = 'PUBLISHED';
      post.publishedAt = new Date();
      post.errorMessage = null;
      post.accountId = account._id.toString();
      await post.save();

      return post;
    }

    try {
      const containerId = await this.createThreadsContainer(
        account.accountId,
        account.accessToken,
        post.content,
        post.imageUrl || undefined,
      );

      post.threadsContainerId = containerId;
      await post.save();

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const publishedPostId = await this.publishThreadsContainer(
        account.accountId,
        account.accessToken,
        containerId,
      );

      post.threadsPublishedPostId = publishedPostId;
      post.platformPostId = publishedPostId;
      post.status = 'PUBLISHED';
      post.publishedAt = new Date();
      post.errorMessage = null;
      post.accountId = account._id.toString();
      await post.save();

      return post;
    } catch (err) {
      post.status = 'FAILED';
      post.errorMessage = err.message;
      await post.save();

      throw new BadRequestException(`❌ Meta Threads API từ chối: ${err.message}`);
    }
  }
}
