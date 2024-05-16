import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const basicAuth = authorizationHeader.split(' ')[1];

    const decodedBasicAuth = Buffer.from(basicAuth, 'base64').toString();
    const authDataArray = decodedBasicAuth.split(/:(.+)/);
    const email = authDataArray[0];
    const password = authDataArray[1];

    const hash = createHash('sha1');
    hash.update(password);
    const hashedPassword = hash.digest('hex');

    const usersCollection = dbClient.db.collection('users');

    const authorizedUser = await usersCollection.findOne({ email, password: hashedPassword });

    if (!authorizedUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;

    const authorizedUserId = authorizedUser._id.toString();

    await redisClient.set(key, authorizedUserId, 86400);

    return res.json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorizedUserId = await redisClient.get(`auth_${token}`);
    if (!authorizedUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(`auth_${token}`);
    return res.sendStatus(204);
  }
}
