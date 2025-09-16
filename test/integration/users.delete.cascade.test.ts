import request from 'supertest';
import app from '../../app';
import { connect, clearDB, closeDB } from '../utils/mongo';

describe('Users delete cascade', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await closeDB(); });
  afterEach(async () => { await clearDB(); });

  it('eliminar usuario borra métricas asociadas a su tenant', async () => {
    await request(app).post('/api/users/register').send({
      name: 'Root', email: 'root@saas.io', password: 'Aa1!aaaa'
    });

    const login = await request(app).post('/api/users/login').send({
      email: 'root@saas.io', password: 'Aa1!aaaa'
    });
    const cookie = login.headers['set-cookie']!;

    // Crear viewer
    const vreg = await request(app).post('/api/users/register').send({
      tenantName: 'T1', name: 'V', email: 'v@foo.com', password: 'Aa1!aaaa'
    });
    const viewerId = vreg.body.userId;

    const loginViewer = await request(app).post('/api/users/login').send({
      email: 'v@foo.com', password: 'Aa1!aaaa'
    });
    const viewerCookie = loginViewer.headers['set-cookie']!;

    // Crear métricas
    await request(app).post('/api/metrics').set('Cookie', viewerCookie)
      .send({ name: 'm1', value: 10 });
    await request(app).post('/api/metrics').set('Cookie', viewerCookie)
      .send({ name: 'm2', value: 20 });

    // Eliminar viewer como admin
    const del = await request(app).delete(`/api/users/delete/${viewerId}`).set('Cookie', cookie);
    expect(del.status).toBe(200);

    // Listar métricas
    const list = await request(app).get('/api/metrics').set('Cookie', cookie);
    expect(list.body.length).toBe(0);
  });
});