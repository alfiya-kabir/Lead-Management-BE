// Throw this anywhere in a controller; the error middleware turns it into JSON.
class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
module.exports = ApiError;
