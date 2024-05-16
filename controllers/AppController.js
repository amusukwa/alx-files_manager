import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class AppController {
  static getStatus(req, res) {
    const status = { redis: redisClient.isAlive(), db: dbClient.isAlive() };
    return res.json(status);
  }

  static async getStats(req, res) {
    const count = { users: await dbClient.nbUsers(), files: await dbClient.nbFiles() };
    return res.json(count);
  }
}
