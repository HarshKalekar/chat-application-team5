// CA-27 / TC-HIS-01 manual check: a message acknowledged with SENT must
// still be in MongoDB after the server is killed and restarted.
//
//   node scripts/ca27-check.js send       (server must be running; prints a message id)
//   node scripts/ca27-check.js verify <id> (after kill + restart; reads MongoDB directly)
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const config = require('../src/config');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

const PORT = process.env.PORT || 3000;

async function send() {
  await mongoose.connect(process.env.MONGO_URI);
  const sender = await User.findOne({ email: 'demo_a@example.com' });
  const other = await User.findOne({ email: 'demo_b@example.com' });
  if (!sender || !other) throw new Error('Run "node scripts/seed.js" first.');
  const conversation = await Conversation.findOne({
    type: 'private',
    participants: { $all: [sender._id, other._id] },
  });
  if (!conversation) throw new Error('Seed conversation not found. Run "node scripts/seed.js" first.');
  await mongoose.disconnect();

  const token = jwt.sign({ sub: String(sender._id) }, config.jwtSecret, { expiresIn: '10m' });
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  const timer = setTimeout(() => {
    console.error('No SENT acknowledgement within 5 seconds. Is the server running?');
    process.exit(1);
  }, 5000);

  ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', payload: { token } })));
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'auth:ok') {
      ws.send(JSON.stringify({
        type: 'message:send',
        payload: {
          conversationId: String(conversation._id),
          content: `CA-27 persistence check ${new Date().toISOString()}`,
          clientMsgId: 'ca27-check',
        },
      }));
    } else if (msg.type === 'message:status') {
      clearTimeout(timer);
      console.log('SENT acknowledgement received.');
      console.log('Message id:', msg.payload.messageId);
      console.log('\nNow kill the server, restart it, then run:');
      console.log(`  node scripts/ca27-check.js verify ${msg.payload.messageId}`);
      ws.close();
      process.exit(0);
    } else if (msg.type === 'error') {
      clearTimeout(timer);
      console.error('Server error:', msg.payload);
      process.exit(1);
    }
  });
  ws.on('error', (err) => {
    console.error('Could not connect:', err.message);
    process.exit(1);
  });
}

async function verify(id) {
  if (!id) throw new Error('Usage: node scripts/ca27-check.js verify <messageId>');
  await mongoose.connect(process.env.MONGO_URI);
  const doc = await Message.findById(id).lean();
  await mongoose.disconnect();
  if (!doc) {
    console.log('FAIL: the acknowledged message is NOT in MongoDB.');
    process.exitCode = 1;
    return;
  }
  console.log('Stored document:', doc);
  const checks = {
    conversation: Boolean(doc.conversation),
    sender: Boolean(doc.sender),
    content: Boolean(doc.content),
    'server timestamp (createdAt)': Boolean(doc.createdAt),
    'status field': Boolean(doc.status),
  };
  Object.entries(checks).forEach(([name, ok]) => console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`));
  if (Object.values(checks).every(Boolean)) {
    console.log('\nAll CA-27 checks passed.');
  } else {
    process.exitCode = 1;
  }
}

const [mode, arg] = process.argv.slice(2);
(mode === 'send' ? send() : mode === 'verify' ? verify(arg) : Promise.reject(new Error('Use "send" or "verify <id>"')))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });