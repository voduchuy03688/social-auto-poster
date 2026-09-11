import { Controller, Get, Post, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AccountsService } from './accounts.service';

@ApiTags('Social Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách các tài khoản Threads / Mạng xã hội đã kết nối' })
  async getAccounts() {
    return this.accountsService.getAllAccounts();
  }

  @Get('oauth/threads/login')
  @ApiOperation({ summary: 'Chuyển hướng trực tiếp sang trang đăng nhập Meta Threads OAuth' })
  async threadsLogin(@Res() res: Response) {
    const appId = process.env.THREADS_APP_ID || process.env.META_APP_ID;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!appId || appId === 'MOCK_APP_ID' || appId.startsWith('YOUR_')) {
      // Tự động kết nối tài khoản Mock Test cho người dùng thử nghiệm ngay mà không bị lỗi Meta OAuth
      await this.accountsService.connectThreadsAccount({
        accountName: `@threads_creator_${Date.now().toString().slice(-4)}`,
        accountId: `threads_id_${Date.now().toString().slice(-6)}`,
        accessToken: `TH_LONG_LIVED_TOKEN_DEMO_${Date.now()}`,
      });
      return res.redirect(`${frontendUrl}?status=threads_connected_mock`);
    }

    const redirectUri = process.env.THREADS_REDIRECT_URI || 'http://localhost:3001/api/v1/accounts/oauth/threads/callback';
    const oauthUrl = this.accountsService.getThreadsOAuthUrl(redirectUri);
    return res.redirect(oauthUrl);
  }

  @Get('oauth/threads/callback')
  @ApiOperation({ summary: 'Callback xử lý code từ Threads OAuth 2.0 -> Đổi token -> Lưu DB' })
  async threadsCallback(@Query('code') code: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!code) {
      return res.redirect(`${frontendUrl}?error=missing_code`);
    }

    try {
      const redirectUri = process.env.THREADS_REDIRECT_URI || 'http://localhost:3001/api/v1/accounts/oauth/threads/callback';
      await this.accountsService.handleThreadsOAuthCallback(code, redirectUri);
      return res.redirect(`${frontendUrl}?status=threads_connected`);
    } catch (err) {
      return res.redirect(`${frontendUrl}?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Get('oauth/facebook/login')
  @ApiOperation({ summary: 'Chuyển hướng trực tiếp sang trang đăng nhập Facebook OAuth' })
  facebookLogin(@Res() res: Response) {
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/v1/accounts/oauth/facebook/callback';
    const oauthUrl = this.accountsService.getFacebookOAuthUrl(redirectUri);
    return res.redirect(oauthUrl);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Kết nối / Cập nhật thủ công tài khoản Threads Access Token' })
  async connectThreads(
    @Body()
    body: {
      accountName: string;
      accountId: string;
      accessToken: string;
      avatarUrl?: string;
      expiresInSeconds?: number;
    },
  ) {
    return this.accountsService.connectThreadsAccount(body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Gỡ bỏ tài khoản kết nối' })
  async deleteAccount(@Param('id') id: string) {
    await this.accountsService.deleteAccount(id);
    return { success: true };
  }
}
