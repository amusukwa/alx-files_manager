import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

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

        // Prepare the new file document
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
            // Insert the new file document into the database
            const result = await dbClient.db.collection('files').insertOne(newFile);
            const { _id } = result.ops[0]; // Extract the auto-generated id

            // Return the new file with only relevant attributes
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
}

export default FilesController;
