import { Schema, model, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  plan: 'free' | 'pro';
  createdAt: Date;
}

const TenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  createdAt: { type: Date, default: Date.now }
});

export default model<ITenant>('Tenant', TenantSchema);