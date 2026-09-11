import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { SocialAccount, SocialAccountDocument } from '../../schemas/social-account.schema';

@Injectable()
export class AccountsService implements OnModuleInit {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @InjectModel(SocialAccount.name)
    private readonly accountModel: Model<SocialAccountDocument>,
  ) {}

  async onModuleInit() {
    const envToken = process.env.THREADS_ACCESS_TOKEN;
    const envAccountId = process.env.THREADS_ACCOUNT_ID || '70469141102';
    const envAccountName = process.env.THREADS_ACCOUNT_NAME || '@hayabusa12121';

    if (envToken) {
      this.logger.log(`🔑 Đang tự động kết nối tài khoản Threads MongoDB từ .env: ${envAccountName}`);
      await this.connectThreadsAccount({
        accountName: envAccountName,
        accountId: envAccountId,
        accessToken: envToken,
      });
    }
  }

  async getAllAccounts(): Promise<SocialAccount[]> {
    return this.accountModel.find().sort({ createdAt: -1 }).exec();
  }

  getThreadsOAuthUrl(redirectUri: string): string {
    const appId = process.env.THREADS_APP_ID || process.env.META_APP_ID || 'MOCK_APP_ID';
    const scope = 'threads_basic,threads_content_publish';
    return `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${scope}&response_type=code`;
  }

  async handleThreadsOAuthCallback(code: string, redirectUri: string): Promise<SocialAccount> {
    const appId = process.env.THREADS_APP_ID || process.env.META_APP_ID;
    const appSecret = process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      this.logger.warn('Chưa cấu hình THREADS_APP_ID/SECRET. Đang chạy trong chế độ kết nối tự động Mock...');
      return this.connectThreadsAccount({
        accountName: `@threads_creator_${Date.now().toString().slice(-4)}`,
        accountId: `threads_id_${code.slice(0, 8)}`,
        accessToken: `TH_LONG_LIVED_TOKEN_${code}`,
      });
    }

    try {
      const tokenUrl = 'https://graph.threads.net/oauth/access_token';
      const formData = new URLSearchParams();
      formData.append('client_id', appId);
      formData.append('client_secret', appSecret);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', redirectUri);
      formData.append('code', code);

      const tokenRes = await axios.post(tokenUrl, formData);
      const shortLivedToken = tokenRes.data.access_token;
      const threadsUserId = tokenRes.data.user_id;

      const longLivedUrl = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`;
      const longLivedRes = await axios.get(longLivedUrl);
      const longLivedToken = longLivedRes.data.access_token || shortLivedToken;
      const expiresIn = longLivedRes.data.expires_in || 60 * 24 * 60 * 60;

      let username = `@user_${threadsUserId}`;
      let avatarUrl = '';
      try {
        const profileUrl = `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${longLivedToken}`;
        const profileRes = await axios.get(profileUrl);
        if (profileRes.data) {
          username = profileRes.data.username ? `@${profileRes.data.username}` : username;
          avatarUrl = profileRes.data.threads_profile_picture_url || '';
        }
      } catch (e) {
        this.logger.warn(`Không lấy được thông tin profile Threads: ${e.message}`);
      }

      return this.connectThreadsAccount({
        accountName: username,
        accountId: threadsUserId,
        accessToken: longLivedToken,
        avatarUrl: avatarUrl,
        expiresInSeconds: expiresIn,
      });
    } catch (err) {
      this.logger.error(`Lỗi trao đổi Threads OAuth Code: ${err.message}`);
      throw new Error(`Xác thực Threads thất bại: ${err.response?.data?.error?.message || err.message}`);
    }
  }

  getFacebookOAuthUrl(redirectUri: string): string {
    const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || 'MOCK_APP_ID';
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${scope}&response_type=code`;
  }

  async connectThreadsAccount(data: {
    accountName: string;
    accountId: string;
    accessToken: string;
    avatarUrl?: string;
    expiresInSeconds?: number;
  }): Promise<SocialAccount> {
    const expiresDate = data.expiresInSeconds
      ? new Date(Date.now() + data.expiresInSeconds * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const account = await this.accountModel.findOneAndUpdate(
      { accountId: data.accountId, platform: 'THREADS' },
      {
        platform: 'THREADS',
        accountName: data.accountName,
        accountId: data.accountId,
        accessToken: data.accessToken,
        tokenExpires: expiresDate,
        avatarUrl: data.avatarUrl || null,
      },
      { upsert: true, returnDocument: 'after' },
    );

    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    await this.accountModel.findByIdAndDelete(id);
  }
}
