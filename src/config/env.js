require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lead_management',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  seedPassword: process.env.SEED_PASSWORD || 'Password123!',
};

// Fail fast: a missing/weak secret would make every token insecure.
function assertEnv() {
  if (!env.jwtSecret || env.jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be set in .env and be at least 16 characters long');
  }
}

module.exports = { env, assertEnv };
