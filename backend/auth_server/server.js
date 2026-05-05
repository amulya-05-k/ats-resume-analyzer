require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const defaultClientOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
];

// Middleware
app.use(express.json());
app.use(cookieParser());

const configuredClientOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const clientOrigins = configuredClientOrigins.length > 0 ? configuredClientOrigins : defaultClientOrigins;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/resumeanalyzer', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Auth DB connected'))
  .catch(err => console.error('Auth DB connection error', err));

// Routes
app.use('/api/auth', authRoutes);

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});
