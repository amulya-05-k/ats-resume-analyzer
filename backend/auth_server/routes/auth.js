const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

const jwtSign = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
};

function sendTokenCookie(res, token) {
  const isSecure = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await User.create({ email, name: name || '', passwordHash, provider: 'local' });
    const token = jwtSign(user);
    sendTokenCookie(res, token);
    return res.json({ success: true, message: 'Signup successful', data: { user: { id: user._id, email: user.email, name: user.name } } });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwtSign(user);
    sendTokenCookie(res, token);
    return res.json({ success: true, message: 'Login successful', data: { user: { id: user._id, email: user.email, name: user.name } } });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

router.post('/logout', (req, res) => {
  try {
    res.clearCookie('token', { httpOnly: true });
    return res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error', err);
    return res.status(500).json({ success: false, message: 'Server error during logout' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Me error', err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// Google sign-in using ID token (client obtains ID token via Google Sign-In)
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ success: false, message: 'ID token required' });
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload || {};
    if (!email) return res.status(400).json({ success: false, message: 'Google token missing email' });
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name: name || '', avatar: picture || '', provider: 'google' });
    }
    const token = jwtSign(user);
    sendTokenCookie(res, token);
    return res.json({ success: true, message: 'Login successful', data: { user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar } } });
  } catch (err) {
    console.error('Google sign-in error', err);
    return res.status(500).json({ success: false, message: 'Google sign-in failed' });
  }
});

module.exports = router;
