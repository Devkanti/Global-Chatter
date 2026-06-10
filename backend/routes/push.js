const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/subscribe', async (req, res) => {
  try {
    const { username, subscription } = req.body;
    
    if (!username || !subscription) {
      return res.status(400).json({ error: 'Username and subscription are required' });
    }

    await User.findOneAndUpdate(
      { username },
      { $addToSet: { pushSubscriptions: subscription } }
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
