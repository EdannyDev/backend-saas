import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authMiddleware, AuthRequest } from '../../middlewares/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/protected', authMiddleware, (req, res) => {
  const aReq = req as AuthRequest;
  res.json({
    userId: aReq.userId,
    tenantId: aReq.tenantId,
    role: aReq.role,
    isAdminGlobal: aReq.isAdminGlobal
  });
});

describe('authMiddleware', () => {
  it('401 si no hay token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/No autorizado/);
  });

  it('401 si token inválido', async () => {
    const res = await request(app).get('/protected').set('Cookie', `token=invalid`);
    expect(res.status).toBe(401);
  });

  it('pasa con token válido y setea campos', async () => {
    const token = jwt.sign(
      { userId: 'u1', tenantId: 't1', role: 'viewer', email: 'foo@saas.io' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    const res = await request(app).get('/protected').set('Cookie', [`token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
    expect(res.body.tenantId).toBe('t1');
    expect(res.body.role).toBe('viewer');
    expect(res.body.isAdminGlobal).toBe(true);
  });
});