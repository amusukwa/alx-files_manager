const request = require('supertest');
const { expect } = require('chai');
const app = require('../../app'); // Assuming app.js is your Express app

describe('API Endpoints', () => {
    let token = '';
    let fileId = '';

    before((done) => {
        // Connect a user and get token for authenticated routes
        request(app)
            .post('/connect')
            .set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=') // Base64 for bob@dylan.com:toto1234!
            .end((err, res) => {
                if (err) return done(err);
                token = res.body.token;
                done();
            });
    });

    it('GET /status should return status', (done) => {
        request(app)
            .get('/status')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('redis');
                expect(res.body).to.have.property('db');
                done();
            });
    });

    it('GET /stats should return stats', (done) => {
        request(app)
            .get('/stats')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('users');
                expect(res.body).to.have.property('files');
                done();
            });
    });

    it('POST /users should create a user', (done) => {
        request(app)
            .post('/users')
            .send({ email: 'newuser@test.com', password: 'password' })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('id');
                expect(res.body).to.have.property('email', 'newuser@test.com');
                done();
            });
    });

    it('GET /connect should authenticate user', (done) => {
        request(app)
            .post('/connect')
            .set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=') // Base64 for bob@dylan.com:toto1234!
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('token');
                token = res.body.token;
                done();
            });
    });

    it('GET /disconnect should log out user', (done) => {
        request(app)
            .get('/disconnect')
            .set('X-Token', token)
            .expect(204)
            .end(done);
    });

    it('GET /users/me should return user info', (done) => {
        request(app)
            .get('/users/me')
            .set('X-Token', token)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('id');
                expect(res.body).to.have.property('email');
                done();
            });
    });

    it('POST /files should upload a file', (done) => {
        request(app)
            .post('/files')
            .set('X-Token', token)
            .send({
                name: 'test_file.txt',
                type: 'file',
                data: Buffer.from('Hello World').toString('base64'),
            })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('id');
                fileId = res.body.id;
                done();
            });
    });

    it('GET /files/:id should return file info', (done) => {
        request(app)
            .get(`/files/${fileId}`)
            .set('X-Token', token)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('id');
                done();
            });
    });

    it('GET /files should return paginated list of files', (done) => {
        request(app)
            .get('/files')
            .set('X-Token', token)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.be.an('array');
                done();
            });
    });

    it('PUT /files/:id/publish should publish a file', (done) => {
        request(app)
            .put(`/files/${fileId}/publish`)
            .set('X-Token', token)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('isPublic', true);
                done();
            });
    });

    it('PUT /files/:id/unpublish should unpublish a file', (done) => {
        request(app)
            .put(`/files/${fileId}/unpublish`)
            .set('X-Token', token)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('isPublic', false);
                done();
            });
    });

    it('GET /files/:id/data should return file data', (done) => {
        request(app)
            .get(`/files/${fileId}/data`)
            .set('X-Token', token)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.text).to.equal('Hello World');
                done();
            });
    });

    it('GET /files/:id/data?size=100 should return file data with size', (done) => {
        request(app)
            .get(`/files/${fileId}/data?size=100`)
            .set('X-Token', token)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.text).to.equal('Hello World'); // Assuming original data for simplicity
                done();
            });
    });
});

