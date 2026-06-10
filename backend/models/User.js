const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  publicKey: {
    type: Object,
    default: null, // JWK object
  },
  avatar: {
    type: String,
    default: '', // base64 string
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['online', 'dnd', 'invisible', 'offline'],
    default: 'offline'
  },
  savedRooms: [{
    type: String // roomIds
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
