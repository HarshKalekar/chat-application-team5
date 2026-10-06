require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

async function seed() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not set. Configure it in your environment.');
  }

  await mongoose.connect(uri);

  try {
    const userA = await User.findOneAndUpdate(
      { email: 'demo_a@example.com' },
      {
        $setOnInsert: {
          username: 'demo_user_a',
          email: 'demo_a@example.com',
          passwordHash: 'REPLACE_WITH_A_REAL_HASH_BEFORE_LOGIN',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    const userB = await User.findOneAndUpdate(
      { email: 'demo_b@example.com' },
      {
        $setOnInsert: {
          username: 'demo_user_b',
          email: 'demo_b@example.com',
          passwordHash: 'REPLACE_WITH_A_REAL_HASH_BEFORE_LOGIN',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    let conversation = await Conversation.findOne({
      participants: { $all: [userA._id, userB._id], $size: 2 },
      type: 'private',
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userA._id, userB._id],
        type: 'private',
      });
    }

    const existingMessage = await Message.findOne({
      conversation: conversation._id,
      sender: userA._id,
      content: 'Hello! This is sample seed data.',
    });

    if (!existingMessage) {
      await Message.create({
        conversation: conversation._id,
        sender: userA._id,
        content: 'Hello! This is sample seed data.',
      });
    }

    console.log('Seed completed successfully.');
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
});