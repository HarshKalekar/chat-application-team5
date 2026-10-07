const express = require('express');
const mongoose = require('mongoose');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const { getOrCreatePrivateConversation } = require('./conversationService');
const { currentUser } = require('../../middleware/currentUser');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Newest messages first from the database, returned oldest to newest for display.
async function loadRecentMessages(conversationId, limit = DEFAULT_LIMIT) {
  const messages = await Message.find({ conversation: conversationId })
    .sort({ _id: -1 })
    .limit(limit);
  return messages.reverse();
}

// Legacy route from the first version, kept so existing tests keep passing.
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

// CA-21: everything below needs to know who the caller is.
router.use(currentUser);

// POST /api/conversations {participantId}: create the private chat the first
// time, return the same one afterwards, and include the recent messages.
router.post('/', async (req, res, next) => {
  try {
    const { participantId } = req.body || {};
    if (!mongoose.isValidObjectId(participantId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A valid participantId is required.');
    }
    const conversation = await getOrCreatePrivateConversation(req.userId, participantId);
    const messages = await loadRecentMessages(conversation._id);
    res.status(200).json({ conversation, messages });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations: only the caller's own conversations.
router.get('/', async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.userId }).sort({ updatedAt: -1 });
    res.status(200).json({ conversations });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/:id/messages?limit=50: recent messages of one chat.
router.get('/:id/messages', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A valid conversation id is required.');
    }
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError(404, 'NOT_FOUND', 'Conversation not found.');

    const isMember = conversation.participants.some((id) => String(id) === req.userId);
    if (!isMember) throw new AppError(403, 'FORBIDDEN_NOT_MEMBER', 'You are not part of this conversation.');

    const requested = Number.parseInt(req.query.limit, 10);
    const limit = Math.min(Number.isNaN(requested) || requested < 1 ? DEFAULT_LIMIT : requested, MAX_LIMIT);
    const messages = await loadRecentMessages(conversation._id, limit);
    res.status(200).json({ messages });
  } catch (error) {
    next(error);
  }
});

module.exports = router;