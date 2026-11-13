const express = require('express');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
