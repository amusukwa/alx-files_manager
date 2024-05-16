import { createHash } from 'crypto';
import dbClient from './db';

export default class Users {
  static async addUser(email, password) {
    const usersCollection = dbClient.db.collection('users');
    const hash = createHash('sha1');
    hash.update(password);
    const hashedPassword = hash.digest('hex');

    const doc = { email, password: hashedPassword };
    await usersCollection.insertOne(doc);
  }

  static async getUser(email) {
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ email }, { projection: { _id: 1, email: 1 } });
    return user;
  }
}
