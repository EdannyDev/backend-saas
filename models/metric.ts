import { Schema, model, Document, Types } from 'mongoose';

export interface IMetric extends Document {
  tenantId?: Types.ObjectId | null;
  name: string;
  value: number;
  date: Date;
}

const MetricSchema = new Schema<IMetric>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: false },
  name: { type: String, required: true },
  value: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

export default model<IMetric>('Metric', MetricSchema);