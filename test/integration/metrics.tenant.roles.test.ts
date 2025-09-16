import request from 'supertest';
import app from '../../app';
import { connect, clearDB, closeDB } from '../utils/mongo';

describe('Metrics & Roles', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await closeDB(); });
  afterEach(async () => { await clearDB(); });

  async function registerAndLoginViewer(email: string, tenantName: string) {
    await request(app).post('/api/users/register').send({
      tenantName,
      name: 'Viewer',
      email,
      password: 'Aa1!aaaa'
    });

    const login = await request(app).post('/api/users/login').send({
      email,
      password: 'Aa1!aaaa'
    });

    return {
      cookie: login.headers['set-cookie']!,
      userId: login.body.userId,
      tenantId: login.body.tenantId
    };
  }

  it('viewer solo ve/crea métricas de su tenant', async () => {
    const v1 = await registerAndLoginViewer('v1@foo.com', 'T1');

    const resCreate = await request(app).post('/api/metrics')
      .set('Cookie', v1.cookie)
      .send({ name: 'metrica1', value: 10 });

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.metric.name).toBe('metrica1');

    const list = await request(app).get('/api/metrics').set('Cookie', v1.cookie);
    expect(list.body.length).toBe(1);
  });

  it('viewer se convierte en analyst tras 5 métricas valiosas', async () => {
    const v = await registerAndLoginViewer('v2@foo.com', 'T2');

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/metrics')
        .set('Cookie', v.cookie)
        .send({ name: `metrica${i}`, value: 50 });
    }

    const relogin = await request(app).post('/api/users/login').send({
      email: 'v2@foo.com',
      password: 'Aa1!aaaa'
    });

    expect(relogin.body.role).toBe('analyst');
  });
});