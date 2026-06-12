const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const rateLimit = require('express-rate-limit');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Google Apps Script Web App URL (to bypass Render's SMTP block)
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const SCRIPT_SECRET = process.env.SCRIPT_SECRET;

// Utility to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /auth/signup
router.post('/signup', authLimiter, async (req, res) => {
  try {
    let { email, password, username } = req.body;
    
    if (typeof email !== 'string' || typeof password !== 'string' || typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    email = email.trim();
    username = username.trim();

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

    const isAdmin = email.toLowerCase() === 'work.devkantisarkar@gmail.com';
    
    // Create unverified user
    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      isVerified: false,
      isAdmin
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
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    let { email, otp } = req.body;
    
    if (typeof email !== 'string' || typeof otp !== 'string') {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    email = email.trim();
    otp = otp.trim();
    
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
      user: { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    let { email, password } = req.body;
    
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    email = email.trim();
    
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

    if (user.isTwoFactorEnabled) {
      const tempToken = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.status(200).json({ require2FA: true, tempToken, message: '2FA required' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({ 
      message: 'Login successful', 
      token, 
      user: { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login/2fa
router.post('/login/2fa', authLimiter, async (req, res) => {
  try {
    const { tempToken, totpCode } = req.body;
    if (!tempToken || !totpCode) {
      return res.status(400).json({ error: 'Missing token or code' });
    }

    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (error) {
    console.error('2FA Login Error:', error);
    res.status(400).json({ error: 'Invalid or expired session' });
  }
});

// Middleware for auth verification for 2FA setup
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /auth/2fa/generate
router.post('/2fa/generate', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.isTwoFactorEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    const secret = speakeasy.generateSecret({ name: `GlobalChatter (${user.email})` });
    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.status(200).json({ qrCodeUrl });
  } catch (error) {
    console.error('Generate 2FA Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/2fa/verify-enable
router.post('/2fa/verify-enable', requireAuth, async (req, res) => {
  try {
    const { totpCode } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA secret not generated' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    user.isTwoFactorEnabled = true;
    await user.save();
    res.status(200).json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Enable 2FA Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/2fa/disable
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { totpCode } = req.body;
    const user = await User.findById(req.userId);

    if (!user.isTwoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();
    res.status(200).json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Disable 2FA Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
