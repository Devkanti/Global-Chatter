const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');

// Google Apps Script Web App URL (to bypass Render's SMTP block)
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const SCRIPT_SECRET = process.env.SCRIPT_SECRET;

// Utility to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ error: 'User already exists' });
      } else {
        // Unverified user, let them retry sending OTP, but don't duplicate
        await User.deleteOne({ _id: existingUser._id });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create unverified user
    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      isVerified: false
    });
    await newUser.save();

    // Generate and save OTP
    const otpCode = generateOTP();
    await OTP.deleteMany({ email }); // Delete old OTPs for this email
    const otpEntry = new OTP({ email, otp: otpCode });
    await otpEntry.save();

    // Send OTP via Google Apps Script
    console.log(`[DEBUG] Saving OTP for ${email}. Code: ${otpCode}`);
    
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        otpCode: otpCode,
        secretToken: SCRIPT_SECRET
      })
    })
    .then(res => res.json())
    .then(data => {
      console.log(`[DEBUG] OTP for ${email} sent via Google Script successfully.`);
    })
    .catch((emailError) => {
      console.error(`[DEBUG] Failed to send email via Google Script to ${email}.`, emailError);
    });

    res.status(200).json({ message: 'OTP processed', email });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark user as verified
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    user.isVerified = true;
    await user.save();
    
    // Delete OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    // Issue JWT
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({ 
      message: 'Account verified successfully', 
      token, 
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Account not verified. Please sign up again to receive an OTP.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({ 
      message: 'Login successful', 
      token, 
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
