const { expect } = require('chai');
const dbClient = require('../../utils/db');

describe('dbClient', () => {
    it('should be connected to MongoDB', (done) => {
        expect(dbClient.isAlive()).to.be.true;
        done();
    });

    it('should have users collection', async () => {
        const users = await dbClient.nbUsers();
        expect(users).to.be.a('number');
    });

    it('should have files collection', async () => {
        const files = await dbClient.nbFiles();
        expect(files).to.be.a('number');
    });
});
