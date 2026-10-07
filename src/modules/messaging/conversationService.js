const Conversation = require('../../models/Conversation');
const User = require('../../models/User');
const { AppError } = require('../../middleware/errorHandler');

// Find the private conversation between two users, or create it.
async function getOrCreatePrivateConversation(userId, otherUserId) {
  if (!userId || !otherUserId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Both user IDs are required.');
  }
  if (String(userId) === String(otherUserId)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A private conversation needs two different users.');
  }

  const [user, otherUser] = await Promise.all([User.findById(userId), User.findById(otherUserId)]);
  if (!user || !otherUser) {
    throw new AppError(404, 'NOT_FOUND', 'One or both users were not found.');
  }

  const participantsKey = Conversation.buildParticipantsKey([user._id, otherUser._id]);
  const existing = await Conversation.findOne({ participantsKey });
  if (existing) return existing;

  try {
    return await Conversation.create({ type: 'private', participants: [user._id, otherUser._id] });
  } catch (error) {
    // Two requests raced: the unique index rejected ours, so return the winner.
    if (error.code === 11000) return Conversation.findOne({ participantsKey });
    throw error;
  }
}

module.exports = { getOrCreatePrivateConversation };
