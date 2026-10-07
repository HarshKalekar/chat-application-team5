const express = require('express');
const mongoose = require('mongoose');
const { getOrCreatePrivateConversation } = require('./conversationService');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

// TODO(CA-17): take userId from the verified JWT instead of the request body.
router.post('/private', async (req, res, next) => {
  try {
    const { userId, otherUserId } = req.body || {};
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(otherUserId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid userId and otherUserId are required.');
    }
    const conversation = await getOrCreatePrivateConversation(userId, otherUserId);
    res.status(200).json({ conversation });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
