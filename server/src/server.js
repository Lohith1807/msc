import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { seedDatabase } from './config/seed.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { logDevError } from './utils/devErrorLogger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy hops (Render, Vercel, Cloudflare, etc.)
app.set('trust proxy', 1);

// CORS configuration: seamless support for Localhost, Render, and Vercel
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // Allow exact matches from allowedOrigins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow all Vercel deployment domains (production & branch previews)
      if (origin.endsWith('.vercel.app') || origin.includes('vercel.app')) {
        return callback(null, true);
      }

      // Permissive fallback
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general API rate limiter
app.use('/api', apiLimiter);

// Root API status endpoint
app.get(['/', '/api'], (req, res) => {
  res.status(200).json({
    success: true,
    service: 'MindLab Backend API',
    status: 'online',
    timestamp: new Date().toISOString(),
    frontendUrl: 'http://localhost:5173',
    endpoints: {
      health: '/api/health',
      cards: '/api/cards',
      stats: '/api/stats',
      users: '/api/users',
      logs: '/api/logs',
      responses: '/api/responses',
    },
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MindLab Authentication API',
  });
});

// Ensure database connection for all API routes (critical for serverless / Vercel)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    // Log database connection failure as a critical dev error
    logDevError({
      err,
      req,
      errorType: 'DatabaseError',
      severity: 'critical',
      httpStatus: 503,
    }).catch(() => {});
    next(err);
  }
});

// Mount Auth & Platform Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.url}`,
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const statusCode = err.statusCode || err.status || 500;

  // Automatically log all errors to Dev Logs (async, non-blocking)
  // Skip logging for 404s and auth errors to reduce noise
  if (statusCode !== 404 && statusCode !== 401 && statusCode !== 403) {
    logDevError({
      err,
      req,
      httpStatus: statusCode,
    }).catch(() => {});
  } else if (statusCode === 503) {
    // Always log service unavailable (DB down)
    logDevError({
      err,
      req,
      errorType: 'DatabaseError',
      severity: 'critical',
      httpStatus: 503,
    }).catch(() => {});
  }

  // Never expose stack traces or technical details to end users
  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? 'Something went wrong. Please try again later.'
        : err.message || 'An error occurred.',
  });
});

// Connect to database and start server (only in persistent node process, not in Vercel serverless)
const startServer = async () => {
  try {
    await connectDB();
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`🌿 MindLab Server running on port ${PORT}`);
      console.log(`📡 API available at: ${process.env.NODE_ENV === 'production' ? 'https://your-render-url.onrender.com' : `http://localhost:${PORT}`}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

// Server export
export default app;
