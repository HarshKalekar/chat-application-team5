const Conversation = require('../../models/Conversation');
const User = require('../../models/User');

/**
 * Find an existing private conversation between two users,
 * or create one if it does not exist.
 */
async function getOrCreatePrivateConversation(userId, otherUserId) {
  if (!userId || !otherUserId) {
    const error = new Error('Both user IDs are required.');
    error.statusCode = 400;
    throw error;
  }

  if (String(userId) === String(otherUserId)) {
    const error = new Error('A private conversation requires two different users.');
    error.statusCode = 400;
    throw error;
  }

  const [user, otherUser] = await Promise.all([
    User.findById(userId),
    User.findById(otherUserId),
  ]);

  if (!user || !otherUser) {
    const error = new Error('One or both users were not found.');
    error.statusCode = 404;
    throw error;
  }

  const participants = [user._id, otherUser._id];

  let conversation = await Conversation.findOne({
    type: 'private',
    participants: { $all: participants, $size: 2 },
  });

  if (!conversation) {
    try {
      conversation = await Conversation.create({
        type: 'private',
        participants,
      });
    } catch (error) {
      // If another request created it simultaneously, reuse it.
      if (error.code !== 11000) {
        throw error;
      }

      conversation = await Conversation.findOne({
        type: 'private',
        participants: { $all: participants, $size: 2 },
      });

      if (!conversation) {
        throw error;
      }
    }
  }

  return conversation;
}

module.exports = { getOrCreatePrivateConversation };