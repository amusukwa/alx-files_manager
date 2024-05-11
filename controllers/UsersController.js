import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        // Check if the email already exists in the database
        const existingUser = await dbClient.db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Already exist' });
        }

        // Hash the password using SHA1
        const hashedPassword = sha1(password);

        // Create a new user object
        const newUser = {
            email,
            password: hashedPassword
        };

        try {
            // Insert the new user into the database
            const result = await dbClient.db.collection('users').insertOne(newUser);
            const { _id } = result.ops[0]; // Extract the auto-generated id

            // Return the new user with only email and id
            return res.status(201).json({ id: _id, email });
        } catch (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export default UsersController;

