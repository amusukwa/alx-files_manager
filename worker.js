import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import { fileQueue } from './controllers/FilesController';
import { userQueue } from './controllers/UsersController';
import dbClient from './utils/db';

async function createThumbnail(originalFilePath) {
  try {
    const sizes = [500, 250, 100];
    for await (const size of sizes) {
      const thumbnail = await imageThumbnail(originalFilePath, { width: size, responseType: 'buffer' });
      fs.writeFileSync(`${originalFilePath}_${size}`, thumbnail);
    }
  } catch (error) {
    console.error(error);
  }
}

fileQueue.process(async (job) => {
  const { userId } = job.data;
  const { fileId } = job.data;
  if (!fileId) {
    Promise.reject(new Error('Missing fileId'));
  }
  if (!userId) {
    return Promise.reject(new Error('Missing userId'));
  }

  const filesCollection = dbClient.db.collection('files');

  let document;
  try {
    document = await filesCollection.findOne({ userId: ObjectId(userId), _id: ObjectId(fileId) });
    createThumbnail(document.localPath);
  } catch (error) {
    return Promise.reject(new Error('File not found'));
  }

  return Promise.resolve();
});

fileQueue.on('completed', () => {
  console.log('complete');
});

fileQueue.on('failed', (job, err) => {
  console.log('failed', err);
});

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    return Promise.reject(new Error('Missing userId'));
  }

  const usersCollection = dbClient.db.collection('users');

  let user;
  try {
    user = await usersCollection.findOne({ _id: ObjectId(userId) });
    console.log('Welcome', user.email);
  } catch (error) {
    return Promise.reject(new Error('User not found'));
  }

  return Promise.resolve();
});

userQueue.on('completed', () => {
  console.log('complete');
});

userQueue.on('failed', (job, err) => {
  console.log('failed', err);
});
