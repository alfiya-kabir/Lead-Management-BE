const { app, request, startDb, stopDb, clearDb, loginAs, bearer } = require('./helpers');

let admin;
const api = (method, url, body) => {
  const r = request(app)[method](`/api/v1${url}`).set(bearer(admin.token));
  return body ? r.send(body) : r;
};

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  admin = await loginAs('admin');
  await api('put', '/lead-fields', {
    fields: [
      { name: 'schoolName', label: 'School name', type: 'text' },
      { name: 'interestedGrade', label: 'Interested grade', type: 'number', required: true },
      { name: 'tourScheduled', label: 'Tour scheduled', type: 'boolean' },
      { name: 'program', label: 'Program', type: 'select', options: ['STEM', 'Arts'] },
    ],
  });
});

const validLead = (extra = {}) => ({
  firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com', status: 'qualified',
  customFields: { schoolName: 'North High', interestedGrade: 10, tourScheduled: true },
  ...extra,
});

describe('leads CRUD', () => {
  test('requires authentication', async () => {
    expect((await request(app).get('/api/v1/leads')).status).toBe(401);
  });

  test('create returns the lead with customFields and assignedTo {id,name}', async () => {
    const res = await api('post', '/leads', validLead({ assignedTo: admin.user.id }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      firstName: 'Sam',
      status: 'qualified',
      contactId: null,
      customFields: { schoolName: 'North High', interestedGrade: 10, tourScheduled: true },
      assignedTo: { id: admin.user.id, name: admin.user.name },
    });
    expect(res.body.data.id).toEqual(expect.any(String));
  });

  test('rejects customFields that break the definitions', async () => {
    const res = await api('post', '/leads', validLead({ customFields: { interestedGrade: '10', program: 'Music', nope: 1 } }));
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['customFields.interestedGrade', 'customFields.program', 'customFields.nope'])
    );
  });

  test('required custom field is enforced on create', async () => {
    const res = await api('post', '/leads', validLead({ customFields: {} }));
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('customFields.interestedGrade');
  });

  test('get, patch (merges customFields), delete', async () => {
    const id = (await api('post', '/leads', validLead())).body.data.id;

    expect((await api('get', `/leads/${id}`)).body.data.firstName).toBe('Sam');

    const patched = await api('patch', `/leads/${id}`, { status: 'won', customFields: { program: 'STEM' } });
    expect(patched.status).toBe(200);
    expect(patched.body.data.status).toBe('won');
    expect(patched.body.data.customFields).toEqual({
      schoolName: 'North High', interestedGrade: 10, tourScheduled: true, program: 'STEM',
    });

    expect((await api('delete', `/leads/${id}`)).status).toBe(200);
    expect((await api('get', `/leads/${id}`)).status).toBe(404);
  });

  test('invalid id gives 400, unknown id gives 404', async () => {
    expect((await api('get', '/leads/not-an-id')).status).toBe(400);
    expect((await api('get', '/leads/64b7f0c2a1b2c3d4e5f60718')).status).toBe(404);
  });
});

describe('lead lists', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i += 1) {
      await api('post', '/leads', validLead({
        firstName: `Lead${i}`, email: `l${i}@example.com`, status: i <= 2 ? 'new' : 'contacted',
        source: i === 1 ? 'web' : 'ads', customFields: { interestedGrade: i },
      }));
    }
  });

  test('pagination returns metadata', async () => {
    const res = await api('get', '/leads?page=2&size=2&sortBy=firstName&order=asc');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 2, size: 2, totalElements: 5, totalPages: 3 });
    expect(res.body.data.content.map((l) => l.firstName)).toEqual(['Lead3', 'Lead4']);
  });

  test('filters and search', async () => {
    expect((await api('get', '/leads?status=new')).body.data.totalElements).toBe(2);
    expect((await api('get', '/leads?source=web')).body.data.totalElements).toBe(1);
    expect((await api('get', '/leads?search=lead4')).body.data.content[0].firstName).toBe('Lead4');
    expect((await api('get', `/leads?assignedTo=${admin.user.id}`)).body.data.totalElements).toBe(0);
  });
});
