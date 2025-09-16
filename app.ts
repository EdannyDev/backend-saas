import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user';
import tenantRoutes from './routes/tenant';
import metricRoutes from './routes/metric';

dotenv.config();
const app = express();

app.use(cors({ origin: ['http://localhost:3000', 'https://edany-saas.vercel.app'], credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => res.send('API funcionando correctamente.'));
app.use('/api/users', userRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/metrics', metricRoutes);

export default app;