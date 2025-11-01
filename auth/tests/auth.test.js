const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');

function extractTokenFromSetCookie(setCookieArray) {
  if (!setCookieArray) return null;
  const cookie = Array.isArray(setCookieArray) ? setCookieArray[0] : setCookieArray;
  const match = cookie.match(/token=([^;]+);?/);
  return match ? match[1] : null;
}

describe('Auth routes (integration tests)', () => {
  const userPayload = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    fullName: { firstName: 'Test', lastName: 'User' },
  };

  describe('registration validation', () => {
    it('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'test' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject registration with duplicate username', async () => {
      await request(app).post('/api/auth/register').send(userPayload);
      const res = await request(app).post('/api/auth/register').send(userPayload);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('login validation', () => {
    it('should reject login with invalid credentials', async () => {
      await request(app).post('/api/auth/register').send(userPayload);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: userPayload.username, password: 'wrongpass' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });
  });

  describe('auth middleware', () => {
    it('should reject requests with no token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no token/i);
    });

    it('should reject requests with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'token=invalid.token.here');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid token/i);
    });

    it('should reject requests with blacklisted token', async () => {
      // Register and get token
      const reg = await request(app).post('/api/auth/register').send(userPayload);
      const token = extractTokenFromSetCookie(reg.headers['set-cookie']);
      
      // Blacklist token by logging out
      await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${token}`);
      
      // Try to use blacklisted token
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token has been invalidated/i);
    });
  });

  it('should register a new user and set token cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(userPayload);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/User Register Successfully/i);
    const token = extractTokenFromSetCookie(res.headers['set-cookie']);
    expect(token).toBeTruthy();
  });

  it('should login an existing user and access protected /me', async () => {
    // register first
    await request(app).post('/api/auth/register').send(userPayload);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: userPayload.username, password: userPayload.password });

    expect(res.status).toBe(200);
    const token = extractTokenFromSetCookie(res.headers['set-cookie']);
    expect(token).toBeTruthy();

    // use token cookie to access /me
    const me = await request(app).get('/api/auth/me').set('Cookie', `token=${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toHaveProperty('username', userPayload.username);
  });

  it('should add, fetch and delete addresses', async () => {
    // register and login
    const reg = await request(app).post('/api/auth/register').send(userPayload);
    const token = extractTokenFromSetCookie(reg.headers['set-cookie']);

    // Add address
    const address = {
      street: '123 Test St',
      city: 'Testville',
      state: 'TS',
      pincode: '12345',
      country: 'Testland',
      isDefault: true,
    };

    const addRes = await request(app)
      .post('/api/auth/users/me/addresses')
      .set('Cookie', `token=${token}`)
      .send(address);

    expect(addRes.status).toBe(200);
    expect(addRes.body.addresses).toHaveLength(1);
    const addrId = addRes.body.addresses[0]._id;

    // Fetch addresses
    const fetch = await request(app).get('/api/auth/users/me/addresses').set('Cookie', `token=${token}`);
    expect(fetch.status).toBe(200);
    expect(fetch.body.addresses).toHaveLength(1);

    // Delete address
    const del = await request(app).delete(`/api/auth/users/me/addresses/${addrId}`).set('Cookie', `token=${token}`);
    expect(del.status).toBe(200);
    expect(del.body.addresses).toHaveLength(0);
  });

  it('should logout and invalidate token via redis blacklist', async () => {
    const reg = await request(app).post('/api/auth/register').send(userPayload);
    const token = extractTokenFromSetCookie(reg.headers['set-cookie']);

    // logout
    const logout = await request(app).get('/api/auth/logout').set('Cookie', `token=${token}`);
    expect(logout.status).toBe(200);

    // subsequent /me should be unauthorized because token is blacklisted
    const meAfter = await request(app).get('/api/auth/me').set('Cookie', `token=${token}`);
    expect(meAfter.status).toBe(401);
  });

  describe('register', () => {
    it('should fail if email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user1',
          email: 'not-an-email',
          password: 'password123',
          fullName: { firstName: 'A', lastName: 'B' },
        });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
    it('should fail if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: '123',
          fullName: { firstName: 'A', lastName: 'B' },
        });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
    it('should fail if role is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user3',
          email: 'user3@example.com',
          password: 'password123',
          fullName: { firstName: 'A', lastName: 'B' },
          role: 'admin',
        });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('login', () => {
    it('should fail if password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user1' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
    it('should fail if user does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nouser', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });
  });

  describe('/me', () => {
    it('should fail if token is expired', async () => {
      // Create a token with short expiry
      const user = {
        _id: '507f191e810c19729de860ea',
        username: 'expireduser',
        email: 'expired@example.com',
        role: 'user',
      };
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1ms' });
      await new Promise((r) => setTimeout(r, 10));
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token expired/i);
    });
  });

  describe('addresses', () => {
    let token, userId;
    beforeEach(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'addressuser',
          email: 'address@example.com',
          password: 'password123',
          fullName: { firstName: 'A', lastName: 'B' },
        });
      token = extractTokenFromSetCookie(reg.headers['set-cookie']);
      // Get userId from /me
      const me = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);
      userId = me.body.user._id;
    });
    it('should fail to add address with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Cookie', `token=${token}`)
        .send({ city: 'X' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
    it('should fail to delete address if not found', async () => {
      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/507f191e810c19729de860ea`)
        .set('Cookie', `token=${token}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/address not found/i);
    });
    it('should fail to add address if not authenticated', async () => {
      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .send({
          street: '123', city: 'C', state: 'S', pincode: 'P', country: 'CO', isDefault: true
        });
      expect(res.status).toBe(401);
    });
    it('should fail to fetch addresses if not authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/users/me/addresses');
      expect(res.status).toBe(401);
    });
    it('should fail to delete address if not authenticated', async () => {
      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/507f191e810c19729de860ea`);
      expect(res.status).toBe(401);
    });
  });

  describe('logout', () => {
    it('should succeed even if no token is present', async () => {
      const res = await request(app).get('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/logged out/i);
    });
  });
});
