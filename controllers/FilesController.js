// This file definitely needs a clean up. Totally aware. :|
// There's a short story to my appalling, NOT DRY coding style :D

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import mime from 'mime-types';
import Queue from 'bull';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export const fileQueue = new Queue('fileQueue');

async function createThumbnail(base64Data, outputPath) {
  try {
    const thumbnail = await imageThumbnail(base64Data, { responseType: 'buffer' });
    fs.writeFileSync(outputPath, thumbnail);
  } catch (error) {
    console.error(error);
  }
}

export default class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorizedUserId = await redisClient.get(`auth_${token}`);

    if (!authorizedUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type } = req.body;
    const parentId = req.body.parentId || '0';
    const isPublic = req.body.isPublic || false;
    const { data } = req.body;
    const fileTypes = ['folder', 'file', 'image'];

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !fileTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const filesCollection = dbClient.db.collection('files');
    let parentFolder = null;

    let parentObjectId = '0';
    if (parentId !== '0') {
      try {
        parentObjectId = ObjectId(parentId);
      } catch (err) {
        return res.status(400).json({ error: 'Parent not found' });
      }
    }

    parentFolder = await filesCollection.findOne({ _id: parentObjectId });

    if (parentId !== '0' && !parentFolder) {
      return res.status(400).json({ error: 'Parent not found' });
    }

    if (parentFolder && parentFolder.type !== 'folder') {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileDocumentTemplate = {
      userId: ObjectId(authorizedUserId), name, type, parentId: parentObjectId, isPublic,
    };
    if (type === 'folder') {
      const folderDocument = fileDocumentTemplate;
      await filesCollection.insertOne(folderDocument);
      const savedFolderDocument = await filesCollection.findOne(folderDocument);
      savedFolderDocument.id = savedFolderDocument._id;
      delete savedFolderDocument._id;
      return res.status(201).json(savedFolderDocument);
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    const fileUUID = uuidv4();
    const localPath = path.join(folderPath, fileUUID);

    if (type === 'image') {
      await createThumbnail(data, localPath);
    }

    if (type === 'file') {
      const plainTextData = Buffer.from(data, 'base64').toString();
      fs.writeFileSync(localPath, plainTextData);
    }

    const fileDocument = { ...fileDocumentTemplate, localPath };
    await filesCollection.insertOne(fileDocument);
    const savedFileDocument = await filesCollection.findOne(fileDocument);
    savedFileDocument.id = savedFileDocument._id;
    delete savedFileDocument._id;
    delete savedFileDocument.localPath;

    if (type === 'image') {
      await fileQueue.add({ userId: savedFileDocument.userId, fileId: savedFileDocument.id });
    }
    return res.status(201).json(savedFileDocument);
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorizedUserId = await redisClient.get(`auth_${token}`);
    if (!authorizedUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const filesCollection = dbClient.db.collection('files');

    let file = null;
    try {
      file = await filesCollection.findOne(
        { userId: ObjectId(authorizedUserId), _id: ObjectId(id) },
      );
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorizedUserId = await redisClient.get(`auth_${token}`);
    if (!authorizedUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || '0';
    const page = req.query.page || 0;

    const filesCollection = dbClient.db.collection('files');

    let cursor;

    if (parentId === '0') {
      cursor = filesCollection.find().skip(page * 20).limit(20);
    } else {
      try {
        cursor = filesCollection.find({
          parentId: ObjectId(parentId),
          userId: ObjectId(authorizedUserId),
        }).skip(page * 20).limit(20);
      } catch (err) {
        return res.json([]);
      }
    }

    const filesList = [];

    for await (const file of cursor) {
      file.id = file._id;
      delete file._id;
      filesList.push(file);
    }

    return res.json(filesList);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorizedUserId = await redisClient.get(`auth_${token}`);
    if (!authorizedUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const filesCollection = dbClient.db.collection('files');

    let file = null;
    try {
      file = await filesCollection.findOne(
        { userId: ObjectId(authorizedUserId), _id: ObjectId(id) },
      );
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne(file, { $set: { isPublic: true } });
    const updatedFile = await filesCollection.findOne(
      { userId: ObjectId(authorizedUserId), _id: ObjectId(id) },
    );

    updatedFile.id = updatedFile._id;
    delete updatedFile._id;

    return res.json(updatedFile);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorizedUserId = await redisClient.get(`auth_${token}`);
    if (!authorizedUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const filesCollection = dbClient.db.collection('files');

    let file = null;
    try {
      file = await filesCollection.findOne(
        { userId: ObjectId(authorizedUserId), _id: ObjectId(id) },
      );
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne(file, { $set: { isPublic: false } });
    const updatedFile = await filesCollection.findOne(
      { userId: ObjectId(authorizedUserId), _id: ObjectId(id) },
    );

    updatedFile.id = updatedFile._id;
    delete updatedFile._id;

    return res.json(updatedFile);
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const imageWidth = req.query.size;

    const { id } = req.params;
    const filesCollection = dbClient.db.collection('files');

    let file = null;
    try {
      file = await filesCollection.findOne(
        { _id: ObjectId(id) },
      );
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const authorizedUserId = await redisClient.get(`auth_${token}`);

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic && file.userId.toString() !== authorizedUserId) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let data;
    const sizeArray = ['500', '200', '100'];
    try {
      data = fs.readFileSync(file.localPath);
      if (sizeArray.includes(imageWidth) && file.type === 'image') {
        data = fs.readFileSync(`${file.localPath}_${imageWidth}`);
      }
    } catch (error) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name);
    res.set('Content-Type', mimeType);
    return res.send(data);
  }
}
