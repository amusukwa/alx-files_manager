import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.error(err));
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });
  }

  async set(key, value, seconds) {
    try {
      this.client.set(key, value, 'EX', seconds);
    } catch (error) {
      console.error(error);
    }
  }

  async del(key) {
    try {
      this.client.del(key);
    } catch (error) {
      console.error(error);
    }
  }
}

const redisClient = new RedisClient();

export default redisClient;
