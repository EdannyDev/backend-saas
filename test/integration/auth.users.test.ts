import request from 'supertest';
import app from '../../app';
import { connect, clearDB, closeDB } from '../utils/mongo';

function getCookieFrom(res: request.Response) {
  const raw = res.headers['set-cookie'];
  return raw && raw[0];
}

describe('Auth & Users', () => {
  beforeAll(async () => { await connect(); });
  afterAll(async () => { await closeDB(); });
  afterEach(async () => { await clearDB(); });

  it('register viewer requiere tenantName, admin no', async () => {
    const admin = await request(app).post('/api/users/register').send({
      name: 'Admin', email: 'root@saas.io', password: 'Aa1!aaaa'
    });
    expect(admin.status).toBe(201);
    expect(admin.body.role).toBe('admin');

    const badViewer = await request(app).post('/api/users/register').send({
      name: 'V', email: 'v@foo.com', password: 'Aa1!aaaa'
    });
    expect(badViewer.status).toBe(400);

    const okViewer = await request(app).post('/api/users/register').send({
      tenantName: 'acme', name: 'V', email: 'v@foo.com', password: 'Aa1!aaaa'
    });
    expect(okViewer.status).toBe(201);
    expect(okViewer.body.role).toBe('viewer');
  });

  it('login emite cookie httpOnly y datos', async () => {
    await request(app).post('/api/users/register').send({
      tenantName: 'acme', name: 'V', email: 'v@foo.com', password: 'Aa1!aaaa'
    });

    const res = await request(app).post('/api/users/login').send({
      email: 'v@foo.com', password: 'Aa1!aaaa'
    });

    expect(res.status).toBe(200);
    const cookie = getCookieFrom(res);
    expect(cookie).toMatch(/token=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(res.body.role).toBe('viewer');
    expect(res.body.tenantId).toBeTruthy();
  });
});