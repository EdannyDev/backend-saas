import request from 'supertest';
import app from '../../app';
import { connect, clearDB, closeDB } from '../utils/mongo';

describe('Tenants', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await closeDB(); });
  afterEach(async () => { await clearDB(); });

  async function loginAdminGlobal() {
    await request(app).post('/api/users/register').send({
      name: 'Root',
      email: 'root@saas.io',
      password: 'Aa1!aaaa'
    });

    const login = await request(app).post('/api/users/login').send({
      email: 'root@saas.io',
      password: 'Aa1!aaaa'
    });

    return login.headers['set-cookie']!;
  }

  it('CRUD básico y visibilidad', async () => {
    const adminCookie = await loginAdminGlobal();

    const c1 = await request(app).post('/api/tenants')
      .set('Cookie', adminCookie)
      .send({ name: 'acme', plan: 'pro' });
    expect(c1.status).toBe(201);

    const list = await request(app).get('/api/tenants').set('Cookie', adminCookie);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);

    const id = c1.body.tenant._id;

    const get = await request(app).get(`/api/tenants/${id}`).set('Cookie', adminCookie);
    expect(get.status).toBe(200);

    const put = await request(app).put(`/api/tenants/${id}`)
      .set('Cookie', adminCookie)
      .send({ name: 'acme-x', plan: 'free' });
    expect(put.status).toBe(200);

    const del = await request(app).delete(`/api/tenants/${id}`).set('Cookie', adminCookie);
    expect(del.status).toBe(200);
  });
});