const ApiError = require('../utils/ApiError');

module.exports = function errorHandler(err, req, res, next) {
  console.error(err);
  
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};