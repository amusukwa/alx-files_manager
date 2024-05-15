const { expect } = require('chai');
const redisClient = require('../../utils/redis');

describe('redisClient', () => {
    it('should be connected to Redis', (done) => {
        expect(redisClient.isAlive()).to.be.true;
        done();
    });

    it('should set and get a key-value pair', (done) => {
        redisClient.set('test_key', 'test_value', 10);
        setTimeout(() => {
            redisClient.get('test_key')
                .then((value) => {
                    expect(value).to.equal('test_value');
                    done();
                })
                .catch((err) => done(err));
        }, 50);
    });

    it('should delete a key', (done) => {
        redisClient.set('test_key', 'test_value', 10);
        redisClient.del('test_key');
        setTimeout(() => {
            redisClient.get('test_key')
                .then((value) => {
                    expect(value).to.be.null;
                    done();
                })
                .catch((err) => done(err));
        }, 50);
    });
});
