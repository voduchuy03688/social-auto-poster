import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Topic', required: false })
  topicId: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  imageUrl: string;

  @Prop()
  aiPrompt: string;

  @Prop({ default: 'DRAFT' })
  status: string;

  @Prop()
  scheduledAt: Date;

  @Prop()
  publishedAt: Date;

  @Prop()
  platformPostId: string;

  @Prop()
  threadsContainerId: string;

  @Prop()
  threadsPublishedPostId: string;

  @Prop()
  errorMessage: string;

  @Prop()
  accountId: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);
