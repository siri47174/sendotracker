const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = require('../app');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  const cols = mongoose.connection.collections;
  await Promise.all(Object.values(cols).map((c) => c.deleteMany({})));
});

describe('GET /', () => {
  it('returns API metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.name).toContain('Sendo');
  });
});

describe('GET /api/months', () => {
  it('returns empty months when no fills', async () => {
    const res = await request(app).get('/api/months');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.months).toEqual([]);
  });
});

describe('POST /api/fills/bulk', () => {
  it('rejects missing month or data', async () => {
    const res = await request(app)
      .post('/api/fills/bulk')
      .send({ month: 'Jan-2026' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('upserts fills for a month', async () => {
    const res = await request(app)
      .post('/api/fills/bulk')
      .send({
        month: 'Jan-2026',
        data: {
          ABC123: {
            '01-Jan': { l: 40, a: 5000, d: 'Driver1', p: 'Cash' },
          },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.saved).toBe(1);

    const monthRes = await request(app).get('/api/months');
    expect(monthRes.body.months).toContain('Jan-2026');

    const fillsRes = await request(app).get('/api/fills/Jan-2026');
    expect(fillsRes.body.data.ABC123['01-Jan'].l).toBe(40);
    expect(fillsRes.body.data.ABC123['01-Jan'].a).toBe(5000);
  });
});

describe('POST /api/odometer', () => {
  it('creates an odometer reading', async () => {
    const res = await request(app)
      .post('/api/odometer')
      .send({
        vehicle: 'XYZ99',
        date: '02-Jan',
        month: 'Jan-2026',
        closingKm: 12000,
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.closingKm).toBe(12000);

    const list = await request(app).get('/api/odometer/XYZ99');
    expect(list.body.data).toHaveLength(1);
  });
});

describe('GET /api/fills/:month', () => {
  it('returns empty data when month has no fills', async () => {
    const res = await request(app).get('/api/fills/Mar-2026');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({});
    expect(res.body.month).toBe('Mar-2026');
  });
});

describe('POST /api/fills', () => {
  it('creates a single fill', async () => {
    const res = await request(app)
      .post('/api/fills')
      .send({
        vehicle: 'car1',
        date: '05-Jan',
        month: 'Jan-2026',
        driver: 'A',
        litres: 25,
        amount: 3000,
        time: '09:00',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicle).toBe('CAR1');
    expect(res.body.data.litres).toBe(25);
  });

  it('merges a second fill on the same vehicle, date, and month', async () => {
    await request(app).post('/api/fills').send({
      vehicle: 'V1',
      date: '10-Jan',
      month: 'Jan-2026',
      litres: 20,
      amount: 2000,
      driver: 'D1',
      paidBy: 'Cash',
      time: '08:00',
    });
    const res = await request(app).post('/api/fills').send({
      vehicle: 'V1',
      date: '10-Jan',
      month: 'Jan-2026',
      litres: 15,
      amount: 1500,
      driver: 'D2',
      paidBy: 'Card',
      time: '18:00',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.litres).toBe(35);
    expect(res.body.data.amount).toBe(3500);
    expect(res.body.data.fills.length).toBeGreaterThanOrEqual(2);
  });
});

describe('DELETE /api/fills/:vehicle/:month/:date', () => {
  it('removes a fill document', async () => {
    await request(app).post('/api/fills/bulk').send({
      month: 'Feb-2026',
      data: { DEL1: { '01-Feb': { l: 10, a: 1000 } } },
    });
    const del = await request(app).delete('/api/fills/DEL1/Feb-2026/01-Feb');
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    const fills = await request(app).get('/api/fills/Feb-2026');
    expect(fills.body.data.DEL1).toBeUndefined();
  });
});

describe('GET /api/odometer/:vehicle/:month', () => {
  it('returns only entries for that month', async () => {
    await request(app).post('/api/odometer').send({
      vehicle: 'M1',
      date: '01-Jan',
      month: 'Jan-2026',
      closingKm: 1000,
    });
    await request(app).post('/api/odometer').send({
      vehicle: 'M1',
      date: '01-Feb',
      month: 'Feb-2026',
      closingKm: 2000,
    });
    const res = await request(app).get('/api/odometer/M1/Jan-2026');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].closingKm).toBe(1000);
  });
});

describe('DELETE /api/odometer/:id', () => {
  it('deletes by Mongo _id', async () => {
    const created = await request(app).post('/api/odometer').send({
      vehicle: 'DELV',
      date: '03-Jan',
      month: 'Jan-2026',
      closingKm: 500,
    });
    const id = created.body.data._id;
    const del = await request(app).delete(`/api/odometer/${id}`);
    expect(del.status).toBe(200);

    const list = await request(app).get('/api/odometer/DELV');
    expect(list.body.data).toHaveLength(0);
  });
});

describe('/api/schedule', () => {
  it('GET returns empty object when no configs', async () => {
    const res = await request(app).get('/api/schedule');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({});
  });

  it('POST upserts a vehicle schedule', async () => {
    const res = await request(app)
      .post('/api/schedule')
      .send({
        vehicle: 's1',
        interval: 7,
        ltrsPerFill: 40,
        kmPerLitre: 12,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.vehicle).toBe('S1');
    expect(res.body.data.interval).toBe(7);

    const get = await request(app).get('/api/schedule');
    expect(get.body.data.S1.interval).toBe(7);
  });

  it('POST /bulk saves multiple vehicles', async () => {
    const res = await request(app)
      .post('/api/schedule/bulk')
      .send({
        configs: {
          A1: { interval: 5, kmPerFill: 400 },
          B2: { interval: 10, ltrsPerFill: 35 },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(2);

    const get = await request(app).get('/api/schedule');
    expect(get.body.data.A1.kmPerFill).toBe(400);
    expect(get.body.data.B2.ltrsPerFill).toBe(35);
  });
});

describe('/api/escalations', () => {
  it('GET returns empty list initially', async () => {
    const res = await request(app).get('/api/escalations');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('POST creates and GET lists escalations', async () => {
    await request(app).post('/api/escalations').send({
      id: 'esc-1',
      vehicle: 'V9',
      date: '15-Jan',
      tags: ['fuel'],
      description: 'Anomaly',
    });
    const res = await request(app).get('/api/escalations');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('esc-1');
    expect(res.body.data[0].status).toBe('open');
  });

  it('PATCH updates by custom id field', async () => {
    await request(app).post('/api/escalations').send({
      id: 'esc-2',
      vehicle: 'V8',
      date: '16-Jan',
    });
    const patch = await request(app)
      .patch('/api/escalations/esc-2')
      .send({ status: 'resolved' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.status).toBe('resolved');
  });

  it('DELETE removes by custom id', async () => {
    await request(app).post('/api/escalations').send({
      id: 'esc-del',
      vehicle: 'VX',
      date: '01-Jan',
    });
    const del = await request(app).delete('/api/escalations/esc-del');
    expect(del.status).toBe(200);
    const list = await request(app).get('/api/escalations');
    expect(list.body.data.find((e) => e.id === 'esc-del')).toBeUndefined();
  });
});
