const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const auth = require('../controllers/auth.controller');
const users = require('../controllers/user.controller');
const leads = require('../controllers/lead.controller');
const contacts = require('../controllers/contact.controller');
const leadFields = require('../controllers/leadField.controller');
const dashboard = require('../controllers/dashboard.controller');

// Public
router.post('/auth/login', auth.login);

// Everything below needs a valid JWT
router.use(authenticate);
router.get('/auth/me', auth.me);

// Users: admin only
router.get('/users', authorize('admin'), users.list);
router.post('/users', authorize('admin'), users.create);
router.get('/users/:id', authorize('admin'), users.getOne);
router.patch('/users/:id', authorize('admin'), users.update);
router.delete('/users/:id', authorize('admin'), users.remove);

// Leads & contacts: any authenticated user
router.get('/leads', leads.list);
router.post('/leads', leads.create);
router.get('/leads/:id', leads.getOne);
router.patch('/leads/:id', leads.update);
router.delete('/leads/:id', leads.remove);

router.get('/contacts', contacts.list);
router.post('/contacts', contacts.create);
router.get('/contacts/:id', contacts.getOne);
router.patch('/contacts/:id', contacts.update);
router.delete('/contacts/:id', contacts.remove);

// Lead form config: anyone can read, admin/manager can change
router.get('/lead-fields', leadFields.get);
router.put('/lead-fields', authorize('admin', 'manager'), leadFields.replace);

router.get('/dashboard/summary', dashboard.summary);
router.get('/dashboard/pipeline', dashboard.pipeline);

module.exports = router;
