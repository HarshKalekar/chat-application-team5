const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config');
const { AppError } = require('./errorHandler');

// Works out who is calling the API.
// 1) Real login: "Authorization: Bearer <jwt>" (token comes from CA-17).
// 2) Testing only: an "x-user-id" header, switched off in production.
// TODO(CA-17): remove the x-user-id fallback once login is merged.
function currentUser(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    if (header.startsWith('Bearer ')) {
      const decoded = jwt.verify(header.slice(7), config.jwtSecret);
      req.userId = String(decoded.sub || decoded.userId || decoded.id);
      return next();
    }

    const testId = req.get('x-user-id');
    if (process.env.NODE_ENV !== 'production' && mongoose.isValidObjectId(testId)) {
      req.userId = String(testId);
      return next();
    }

    throw new AppError(401, 'AUTH_FAILED', 'Authentication required.');
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, 'AUTH_FAILED', 'Authentication required.'));
  }
}

module.exports = { currentUser };