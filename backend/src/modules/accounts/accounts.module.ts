import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialAccount, SocialAccountSchema } from '../../schemas/social-account.schema';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SocialAccount.name, schema: SocialAccountSchema }]),
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
