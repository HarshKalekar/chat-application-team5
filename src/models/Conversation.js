const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: {
        validator(participants) {
          const unique = new Set(participants.map(String)).size === participants.length;
          if (!unique || participants.length < 2) return false;
          return this.type !== 'private' || participants.length === 2;
        },
        message: 'A private conversation needs exactly two unique participants.',
      },
    },
    type: { type: String, enum: ['private', 'group'], default: 'private', required: true },
    // Sorted "idA_idB" key. The unique index on it stops duplicate private chats.
    participantsKey: { type: String },
  },
  { timestamps: true }
);

function buildParticipantsKey(ids) {
  return ids.map(String).sort().join('_');
}

conversationSchema.pre('validate', function setKey() {
  if (this.type === 'private' && this.participants.length === 2) {
    this.participantsKey = buildParticipantsKey(this.participants);
  }
});

conversationSchema.index({ participantsKey: 1 }, { unique: true, sparse: true });
conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
Conversation.buildParticipantsKey = buildParticipantsKey;
module.exports = Conversation;
