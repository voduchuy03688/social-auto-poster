import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SocialAccountDocument = SocialAccount & Document;

@Schema({ timestamps: true })
export class SocialAccount {
  @Prop({ required: true, default: 'THREADS' })
  platform: string;

  @Prop({ required: true })
  accountName: string;

  @Prop({ required: true })
  accountId: string;

  @Prop({ required: true })
  accessToken: string;

  @Prop()
  tokenExpires: Date;

  @Prop()
  avatarUrl: string;
}

export const SocialAccountSchema = SchemaFactory.createForClass(SocialAccount);
