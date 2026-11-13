const { app, request, startDb, stopDb, clearDb, loginAs, createUser, bearer } = require('./helpers');
const Lead = require('../src/models/Lead');
const Contact = require('../src/models/Contact');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const get = (url, token) => request(app).get(`/api/v1${url}`).set(bearer(token));

describe('dashboard', () => {
  test('summary and pipeline are calculated from the data', async () => {
    const { token } = await loginAs('agent');
    const other = await createUser();
    const old = new Date(Date.now() - 90 * 86400000);

    await Contact.create([{ name: 'A' }, { name: 'B' }]);
    await Lead.create([
      { firstName: 'a', status: 'new', value: 100 },
      { firstName: 'b', status: 'new', value: 50, assignedTo: other._id },
      { firstName: 'c', status: 'won', value: 1000 },
      { firstName: 'd', status: 'lost', value: 10, createdAt: old },
    ]);

    const summary = await get('/dashboard/summary', token);
    expect(summary.status).toBe(200);
    expect(summary.body.data).toEqual({
      totalLeads: 4, leadsThisMonth: 3, openLeads: 2, wonLeads: 1, totalContacts: 2,
    });

    const pipeline = await get('/dashboard/pipeline', token);
    const stages = Object.fromEntries(pipeline.body.data.stages.map((s) => [s.status, s]));
    expect(pipeline.body.data.stages.map((s) => s.status)).toEqual(
      ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
    );
    expect(stages.new).toMatchObject({ count: 2, totalValue: 150 });
    expect(stages.won).toMatchObject({ count: 1, totalValue: 1000 });
    expect(stages.contacted).toMatchObject({ count: 0, totalValue: 0 });
  });

  test('assignedTo and date filters apply', async () => {
    const { token } = await loginAs('agent');
    const other = await createUser();
    await Lead.create([
      { firstName: 'a', status: 'new', value: 100, assignedTo: other._id },
      { firstName: 'b', status: 'won', value: 200 },
    ]);

    const mine = await get(`/dashboard/pipeline?assignedTo=${other.id}`, token);
    expect(mine.body.data.stages.find((s) => s.status === 'new').count).toBe(1);
    expect(mine.body.data.stages.find((s) => s.status === 'won').count).toBe(0);

    const future = await get('/dashboard/summary?from=2999-01-01', token);
    expect(future.body.data.totalLeads).toBe(0);

    expect((await get('/dashboard/summary?from=garbage', token)).status).toBe(400);
  });
});
