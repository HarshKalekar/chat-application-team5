const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      required: true,
      validate: {
        validator: (participants) =>
          participants.length >= 2 &&
          new Set(participants.map(String)).size === participants.length,
        message: 'A conversation must have at least two unique participants.',
      },
    },
    type: {
      type: String,
      enum: ['private', 'group'],
      default: 'private',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Conversation', conversationSchema);