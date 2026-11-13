const { stamp } = require('../utils/response');
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Internal server error';
  let errors;

  if (err instanceof ApiError) {
    ({ status, message, errors } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400; message = 'Invalid JSON body';
  } else if (err.name === 'ValidationError') {
    status = 400; message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400; message = 'Validation failed';
    errors = [{ field: err.path, message: `Invalid value for ${err.path}` }];
  } else if (err.code === 11000) {
    status = 409; message = 'Duplicate value';
    errors = Object.keys(err.keyPattern || {}).map((f) => ({ field: f, message: `${f} already exists` }));
  } else if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  const body = { success: false, message, timestamp: stamp() };
  if (errors) body.errors = errors;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
