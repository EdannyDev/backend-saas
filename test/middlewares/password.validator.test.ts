import request from 'supertest';
import express from 'express';
import { passwordValidator } from '../../middlewares/auth';

const app = express();
app.use(express.json());
app.post('/change', passwordValidator, (req, res) => res.json({ ok: true }));

describe('passwordValidator', () => {
  it('400 si contraseña débil', async () => {
    const res = await request(app).post('/change').send({ password: 'abc' });
    expect(res.status).toBe(400);
  });

  it('200 si no viene password (update parcial)', async () => {
    const res = await request(app).post('/change').send({ name: 'X' });
    expect(res.status).toBe(200);
  });

  it('200 si contraseña fuerte', async () => {
    const res = await request(app).post('/change').send({ password: 'Aa1!aaaa' });
    expect(res.status).toBe(200);
  });
});