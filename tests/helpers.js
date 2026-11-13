const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongod;
let counter = 0;
const PASSWORD = 'Password123!';

// Each test file starts its own throw-away in-memory MongoDB (no setup needed).
async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build unique indexes
}
async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}
async function clearDb() {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
}

async function createUser(overrides = {}) {
  counter += 1;
  return User.create({
    name: `User ${counter}`,
    email: `user${counter}@example.com`,
    role: 'agent',
    passwordHash: await User.hashPassword(PASSWORD),
    ...overrides,
  });
}

// Creates a user, logs in through the real endpoint, returns { user, token }.
async function loginAs(role = 'admin') {
  const user = await createUser({ role });
  const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
  return { user, token: res.body.data.token };
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, startDb, stopDb, clearDb, createUser, loginAs, bearer, PASSWORD };
