require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./models/Message');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const msgs = await Message.find({ reactions: { $exists: true, $ne: {} } }).limit(5);
  console.log('Messages with reactions:', msgs.map(m => ({
    id: m.id,
    reactions: Object.fromEntries(m.reactions)
  })));
  
  // also check if any message exists with the ID they showed in the screenshot maybe?
  const allMsgs = await Message.find().sort({timestamp: -1}).limit(5);
  console.log('Recent messages:', allMsgs.map(m => ({
    id: m.id,
    text: m.text,
    reactions: m.reactions ? Object.fromEntries(m.reactions) : null
  })));
  process.exit();
}).catch(console.error);
