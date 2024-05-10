import { createClient } from 'redis';

class RedisClient {
    constructor() {
        this.client = createClient();

        this.client.on('error', (error) => {
            console.error(`Redis client error: ${error}`);
        });
    }

    isAlive() {
        return this.client.connected;
    }

    async get(key) {
        return new Promise((resolve, reject) => {
            this.client.get(key, (error, reply) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(reply);
            });
        });
    }

    async set(key, value, durationInSeconds) {
        this.client.set(key, value, 'EX', durationInSeconds);
    }

    async del(key) {
        this.client.del(key);
    }
}

const redisClient = new RedisClient();

export default redisClient;
