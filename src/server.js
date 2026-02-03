import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import telemetryRoutes from './routes/telemetryRoutes.js';
import pool from './database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy (required behind Railway/nginx so X-Forwarded-For and rate limiting work)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Tesla public key endpoint (required for Fleet API / virtual key)
app.get('/.well-known/appspecific/com.tesla.3p.public-key.pem', (req, res) => {
  try {
    const publicKeyPath = path.join(__dirname, '../keys/public-key.pem');
    let publicKey = null;
    if (fs.existsSync(publicKeyPath)) {
      publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    } else if (process.env.TESLA_PUBLIC_KEY_PEM?.trim()) {
      publicKey = process.env.TESLA_PUBLIC_KEY_PEM.trim();
    }
    if (publicKey) {
      res.type('text/plain').send(publicKey);
      console.log('✅ Served public key');
    } else {
      res.status(404).send('Public key not found. Run: node src/utils/generateKeys.js and set TESLA_PUBLIC_KEY_PEM on Railway, or commit keys/public-key.pem.');
    }
  } catch (error) {
    res.status(500).send('Error reading public key');
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// API routes
const apiBasePath = config.apiBasePath;
app.use(`${apiBasePath}/auth`, authRoutes);
app.use(`${apiBasePath}/vehicles`, vehicleRoutes);
app.use(`${apiBasePath}/partner`, partnerRoutes);
app.use(`${apiBasePath}/telemetry`, telemetryRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tesla Driving Metrics API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: `${apiBasePath}/auth`,
      vehicles: `${apiBasePath}/vehicles`,
      telemetry: `${apiBasePath}/telemetry`,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log('\n🚀 Tesla Driving Metrics Backend Server');
  console.log('========================================');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`API base path: ${apiBasePath}`);
  console.log(`\nEndpoints:`);
  console.log(`  - Health check: http://localhost:${PORT}/health`);
  console.log(`  - Auth: http://localhost:${PORT}${apiBasePath}/auth`);
  console.log(`  - Vehicles: http://localhost:${PORT}${apiBasePath}/vehicles`);
  console.log(`  - Telemetry: http://localhost:${PORT}${apiBasePath}/telemetry (ingest, recent)`);
  console.log(`\nTesla OAuth redirect_uri (add this in Tesla Developer Portal → App → Redirect URIs):`);
  console.log(`  ${config.tesla.redirectUri}`);
  console.log('\n========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

export default app;
