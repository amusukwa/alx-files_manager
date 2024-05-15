import Bull from 'bull';
import dbClient from './db';

const userQueue = new Bull('userQueue');

userQueue.process(async (job) => {
    const { userId } = job.data;

    if (!userId) {
        throw new Error('Missing userId');
    }

    const user = await dbClient.findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    console.log(`Welcome ${user.email}!`);

    // In real life, you would send an email here
    // e.g., using a service like Mailgun
});

// Processing fileQueue if exists (from previous steps)
const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
    const { userId, fileId } = job.data;

    if (!fileId) {
        throw new Error('Missing fileId');
    }

    if (!userId) {
        throw new Error('Missing userId');
    }

    const file = await dbClient.findFileById(fileId);
    if (!file || file.userId !== userId) {
        throw new Error('File not found');
    }

    const imageThumbnail = require('image-thumbnail');

    const options = {
        500: { width: 500 },
        250: { width: 250 },
        100: { width: 100 },
    };

    for (const [size, opts] of Object.entries(options)) {
        const thumbnail = await imageThumbnail(file.localPath, opts);
        const thumbnailPath = `${file.localPath}_${size}`;
        await fs.promises.writeFile(thumbnailPath, thumbnail);
    }

    console.log(`Thumbnails created for file ${fileId}`);
});

