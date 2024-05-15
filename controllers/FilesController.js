import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import mime from 'mime-types';

class FilesController {
    static async postUpload(req, res) {
        const { name, type, parentId = 0, isPublic = false, data } = req.body;
        const userId = req.user.id; // Assuming the user ID is available in req.user from authentication middleware

        // Check if name and type are provided
        if (!name) {
            return res.status(400).json({ error: 'Missing name' });
        }
        if (!type || !['folder', 'file', 'image'].includes(type)) {
            return res.status(400).json({ error: 'Missing type or invalid type' });
        }
        if (type !== 'folder' && !data) {
            return res.status(400).json({ error: 'Missing data' });
        }

        // Check if parentId is valid
        if (parentId !== 0) {
            const parentFile = await dbClient.db.collection('files').findOne({ _id: parentId });
            if (!parentFile || parentFile.type !== 'folder') {
                return res.status(400).json({ error: 'Parent not found or is not a folder' });
            }
        }

        const newFile = {
            userId,
            name,
            type,
            parentId,
            isPublic,
        };

        // If type is file or image, save data to disk
        if (type === 'file' || type === 'image') {
            const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
            const filePath = `${folderPath}/${uuidv4()}`;

            try {
                // Save file to disk
                await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));
                newFile.localPath = filePath;
            } catch (error) {
                console.error('Error saving file to disk:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }

        try {
            const result = await dbClient.db.collection('files').insertOne(newFile);
            const { _id } = result.ops[0];
            return res.status(201).json({
                id: _id,
                userId,
                name,
                type,
                isPublic,
                parentId,
            });
        } catch (error) {
            console.error('Error creating file:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
	 static async getShow(req, res) {
        const { id } = req.params;
        const userId = req.user.id; 
        const file = await dbClient.db.collection('files').findOne({ _id: id, userId });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }
        return res.json(file);
    }

	 static async putPublish(req, res) {
        const { id } = req.params;
        const userId = req.user.id;

        const file = await dbClient.db.collection('files').findOne({ _id: id, userId });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }
        await dbClient.db.collection('files').updateOne({ _id: id }, { $set: { isPublic: true } });
        return res.status(200).json(file);
    }
	static async getIndex(req, res) {
        const { parentId = '0', page = '0' } = req.query;
        const userId = req.user.id;

        // Pagination parameters
        const pageSize = 20;
        const skip = parseInt(page) * pageSize;
        const files = await dbClient.db.collection('files')
            .find({ parentId, userId })
            .skip(skip)
            .limit(pageSize)
            .toArray()
        return res.json(files);
    }


	static async putUnpublish(req, res) {
        const { id } = req.params;
        const userId = req.user.id;

        const file = await dbClient.db.collection('files').findOne({ _id: id, userId });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        await dbClient.db.collection('files').updateOne({ _id: id }, { $set: { isPublic: false } });

        return res.status(200).json(file);
    }

	static async putUnpublish(req, res) {
        const { id } = req.params;
        const userId = req.user.id;
        const file = await dbClient.db.collection('files').findOne({ _id: id, userId });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        // Update isPublic to false
        await dbClient.db.collection('files').updateOne({ _id: id }, { $set: { isPublic: false } });

        // Return updated file document
        return res.status(200).json(file);
    }
	 static async getFile(req, res) {
        const { id } = req.params;
        const { size } = req.query;

        // Find the file document based on the ID
        const file = await dbClient.db.collection('files').findOne({ _id: id });

        // If no file document is found, return 404 error
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }
        if (!file.isPublic && (!req.user || req.user.id !== file.userId)) {
            return res.status(404).json({ error: 'Not found' });
        }
        if (file.type === 'folder') {
            return res.status(400).json({ error: 'A folder doesn\'t have content' });
        }

        const filePath = `${file.localPath}_${size}`;
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
        } catch (error) {
            return res.status(404).json({ error: 'Not found' });
        }
        const mimeType = mime.lookup(file.name);
        res.setHeader('Content-Type', mimeType);
        fs.createReadStream(filePath).pipe(res);
    }
}

export default FilesController;
