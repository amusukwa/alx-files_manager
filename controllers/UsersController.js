import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export const userQueue = new Queue('userQueue');

export class UsersController {
  static async postNew(req, res) {
    const { email } = req.body;
    const { password } = req.body;
    const users = dbClient.db.collection('users');

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    if (await users.findOne({ email })) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hash = createHash('sha1');
    hash.update(password);
    const hashedPassword = hash.digest('hex');

    const doc = { email, password: hashedPassword };
    await users.insertOne(doc);

    const userObject = await users.findOne({ email }, { projection: { _id: 1, email: 1 } });
    const user = { id: userObject._id, email: userObject.email };

    await userQueue.add({ userId: user.id.toString() });

    return res.status(201).json(user);
  }
}

export class UserController {
  static async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorizedUserId = await redisClient.get(`auth_${token}`);

    if (!authorizedUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const usersCollection = dbClient.db.collection('users');

    const userObject = await usersCollection.findOne({ _id: ObjectId(authorizedUserId) },
      { projection: { _id: 1, email: 1 } });
    const user = { id: userObject._id, email: userObject.email };
    return res.json(user);
  }
}
