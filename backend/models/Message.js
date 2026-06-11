const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String, // 'global' or custom private room ID
    required: true,
    index: true,
  },
  sender: {
    type: String, // username
    required: true,
  },
  text: {
    type: String, // encrypted text
    required: true,
  },
  timestamp: {
    type: Number,
    default: () => Date.now(),
  },
  id: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['text', 'system', 'audio'],
    default: 'text'
  },
  readBy: [{
    type: String // array of usernames who read it
  }],
  replyTo: {
    type: String, // ID of the message being replied to
    default: null
  },
  reactions: {
    type: Map,
    of: [String], // emoji -> array of usernames
    default: {}
  },
  audioData: {
    type: String, // Base64 audio
    default: null
  },
  payload: {
    type: Object, // E2EE encrypted blob and keys
    default: null
  }
});

module.exports = mongoose.model('Message', messageSchema);
