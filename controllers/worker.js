import Bull from 'bull';
import imageThumbnail from 'image-thumbnail'; // Assuming you have image-thumbnail module installed

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
    const { userId, fileId } = job.data;

    // Check if userId and fileId are present
    if (!userId) {
        throw new Error('Missing userId');
    }
    if (!fileId) {
        throw new Error('Missing fileId');
    }

    // Find the file document in the database based on fileId and userId
    const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });
    if (!file) {
        throw new Error('File not found');
    }

    const thumbnail500 = await imageThumbnail(file.localPath, { width: 500 });
    const thumbnail250 = await imageThumbnail(file.localPath, { width: 250 });
    const thumbnail100 = await imageThumbnail(file.localPath, { width: 100 });

    const filePath500 = `${file.localPath}_500`;
    const filePath250 = `${file.localPath}_250`;
    const filePath100 = `${file.localPath}_100`;

    await fs.promises.writeFile(filePath500, thumbnail500);
    await fs.promises.writeFile(filePath250, thumbnail250);
    await fs.promises.writeFile(filePath100, thumbnail100);
});

