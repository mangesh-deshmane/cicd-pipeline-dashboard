const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 60000,
    lazyConnect: true
  }
});

client.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

client.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

// Connect to Redis
client.connect().catch(console.error);

module.exports = client;
