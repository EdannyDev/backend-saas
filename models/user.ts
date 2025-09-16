import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  tenantId?: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'analyst' | 'viewer';
  metricsCreated?: number;
  metricsCreatedValuable?: number;
  canBeAnalyst?: boolean;
  createdAt: Date;
  tempPassword?: string | undefined;
  tempPasswordExpires?: Date | undefined;
}

const UserSchema = new Schema<IUser>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: false },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tempPassword: { type: String, required: false },
  tempPasswordExpires: { type: Date, required: false },
  role: { type: String, enum: ['admin', 'analyst', 'viewer'], default: 'viewer' },
  metricsCreated: { type: Number, default: 0 },
  metricsCreatedValuable: { type: Number, default: 0 },
  canBeAnalyst: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default model<IUser>('User', UserSchema);