const { app, request, startDb, stopDb, clearDb, createUser, loginAs, bearer, PASSWORD } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('auth', () => {
  test('login returns a token and never leaks the password hash', async () => {
    const user = await createUser({ role: 'admin' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(user.email);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  test('wrong password gives 401', async () => {
    const user = await createUser();
    const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'nope-nope' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('login validates input', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  test('/auth/me needs a token and returns the current user', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);

    const { user, token } = await loginAs('agent');
    const res = await request(app).get('/api/v1/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });

  test('only admins can manage users', async () => {
    const agent = await loginAs('agent');
    expect((await request(app).get('/api/v1/users').set(bearer(agent.token))).status).toBe(403);

    const admin = await loginAs('admin');
    const res = await request(app)
      .post('/api/v1/users').set(bearer(admin.token))
      .send({ name: 'New Agent', email: 'new@example.com', password: 'Password123!', role: 'agent' });
    expect(res.status).toBe(201);
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});
