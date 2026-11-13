// WARNING: wipes users, leads, contacts and lead fields, then inserts sample data.
const mongoose = require('mongoose');
const { env } = require('../config/env');
const { connectDb } = require('../config/db');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const LeadField = require('../models/LeadField');

async function seed() {
  await connectDb(env.mongoUri);
  await Promise.all([User.deleteMany({}), Lead.deleteMany({}), Contact.deleteMany({}), LeadField.deleteMany({})]);

  const passwordHash = await User.hashPassword(env.seedPassword);
  const [admin, manager, agent] = await User.create([
    { name: 'Ada Admin', email: 'admin@example.com', role: 'admin', passwordHash },
    { name: 'Max Manager', email: 'manager@example.com', role: 'manager', passwordHash },
    { name: 'Alex Agent', email: 'agent@example.com', role: 'agent', passwordHash },
  ]);

  await LeadField.insertMany([
    { name: 'schoolName', label: 'School name', type: 'text', required: false, order: 0 },
    { name: 'interestedGrade', label: 'Interested grade', type: 'number', order: 1 },
    { name: 'tourScheduled', label: 'Tour scheduled', type: 'boolean', order: 2 },
    { name: 'tourDate', label: 'Tour date', type: 'date', order: 3 },
    { name: 'program', label: 'Program', type: 'select', options: ['STEM', 'Arts', 'Sports'], order: 4 },
  ]);

  const [c1, c2, c3] = await Contact.create([
    { name: 'Priya Shah', email: 'priya@example.com', phone: '+1 555 0101', company: 'North High', tags: ['parent', 'vip'] },
    { name: 'Tom Becker', email: 'tom@example.com', company: 'Becker & Co', tags: ['partner'] },
    { name: 'Lena Ortiz', email: 'lena@example.com', tags: ['parent'] },
  ]);

  const daysAgo = (n) => new Date(Date.now() - n * 86400000);
  const leads = [
    { firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com', source: 'website', status: 'qualified', value: 5000, assignedTo: agent._id, contactId: c1._id, tags: ['hot'], customFields: { schoolName: 'North High', interestedGrade: 10, tourScheduled: true, program: 'STEM' } },
    { firstName: 'Jordan', lastName: 'Park', email: 'jordan@example.com', source: 'referral', status: 'new', value: 1200, assignedTo: agent._id, contactId: c1._id, customFields: { interestedGrade: 8 } },
    { firstName: 'Riley', lastName: 'Chen', source: 'website', status: 'contacted', value: 3000, assignedTo: manager._id, contactId: c2._id, customFields: {} },
    { firstName: 'Casey', lastName: 'Diaz', email: 'casey@example.com', source: 'event', status: 'proposal', value: 8000, assignedTo: manager._id, contactId: c3._id, tags: ['hot'], customFields: { program: 'Arts' } },
    { firstName: 'Morgan', lastName: 'Fox', source: 'website', status: 'won', value: 10000, assignedTo: agent._id, customFields: { tourScheduled: false } },
    { firstName: 'Taylor', lastName: 'Ng', source: 'ads', status: 'lost', value: 2000, assignedTo: null, customFields: {} },
  ];
  // Spread creation dates so date-range filters have something to show.
  await Lead.create(leads.map((l, i) => ({ ...l, createdAt: daysAgo(i * 12) })));

  console.log('Seeded. Log in with any of:');
  [admin, manager, agent].forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}  /  ${env.seedPassword}`));
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
