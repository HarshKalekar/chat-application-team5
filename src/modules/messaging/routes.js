const express = require('express');
const mongoose = require('mongoose');
const {
  getOrCreatePrivateConversation,
} = require('./conversationService');

const router = express.Router();

router.post('/private', async (req, res, next) => {
  try {
    const { userId, otherUserId } = req.body;

    if (
      !mongoose.isValidObjectId(userId) ||
      !mongoose.isValidObjectId(otherUserId)
    ) {
      return res.status(400).json({
        error: 'Valid userId and otherUserId are required.',
      });
    }

    const conversation = await getOrCreatePrivateConversation(
      userId,
      otherUserId
    );

    return res.status(200).json({ conversation });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
