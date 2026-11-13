
const { env, assertEnv } = require('./config/env');
const { connectDb } = require('./config/db');
const app = require('./app');

async function start() {
  assertEnv();
  await connectDb(env.mongoUri);
  console.log('MongoDB connected');
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}/api/v1`));
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
