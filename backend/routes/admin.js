const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Admin Auth Middleware
const adminAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'No token, authorization denied' });

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Get Dashboard Stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const globalMessages = await Message.countDocuments({ roomId: 'global' });
    
    // In-memory online user count (approximated, backend state not fully exposed to routes yet)
    
    res.json({ totalUsers, globalMessages });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get All Users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, 'username email reputationScore suspendedUntil isVerified createdAt isAdmin');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update User (Suspend or alter reputation)
router.post('/users/:id/moderate', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, value } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isAdmin) return res.status(403).json({ error: 'Cannot moderate another admin' });

    if (action === 'suspend') {
      const hours = parseInt(value);
      if (hours > 0) {
        user.suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      } else {
        user.suspendedUntil = null;
      }
    } else if (action === 'reputation') {
      user.reputationScore = parseInt(value);
    }
    
    await user.save();
    res.json({ success: true, user: { username: user.username, suspendedUntil: user.suspendedUntil, reputationScore: user.reputationScore } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
