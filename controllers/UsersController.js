import Bull from 'bull';
import dbClient from '../utils/db';

const userQueue = new Bull('userQueue');

class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        const existingUser = await dbClient.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Already exist' });
        }

        const newUser = await dbClient.createUser(email, password);
        if (newUser) {
            // Add a job to the userQueue
            await userQueue.add({ userId: newUser._id });

            return res.status(201).json({ id: newUser._id, email: newUser.email });
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}

 static async getMe(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const key = `auth_${token}`;
        const userId = await redisClient.get(key);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await dbClient.db.collection('users').findOne({ _id: userId });

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.status(200).json({ id: user._id, email: user.email });
    }
}

export default UsersController;
