import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TopicDocument = Topic & Document;

@Schema({ timestamps: true })
export class Topic {
  @Prop({ required: true })
  topicTitle: string;

  @Prop()
  keywords: string;

  @Prop()
  targetAudience: string;

  @Prop({ default: 'PENDING' })
  status: string;
}

export const TopicSchema = SchemaFactory.createForClass(Topic);
