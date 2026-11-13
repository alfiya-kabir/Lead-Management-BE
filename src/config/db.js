
const dns = require('node:dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

async function connectDb(uri) {
  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = { connectDb };
