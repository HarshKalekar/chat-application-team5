const request = require('supertest');
const { createApp } = require('../src/app');

describe('POST /api/conversations/private (CA-21)', () => {
  it('returns 400 for invalid user ids', async () => {
    const res = await request(createApp())
      .post('/api/conversations/private')
      .send({ userId: 'x', otherUserId: 'y' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
