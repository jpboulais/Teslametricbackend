import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBasePath: process.env.API_BASE_PATH || '/api/v1',

  // Tesla API Configuration
  tesla: {
    clientId: process.env.TESLA_CLIENT_ID,
    clientSecret: process.env.TESLA_CLIENT_SECRET,
    redirectUri: process.env.TESLA_REDIRECT_URI,
    authBaseUrl: process.env.TESLA_AUTH_BASE_URL || 'https://auth.tesla.com',
    apiBaseUrl: process.env.TESLA_API_BASE_URL || 'https://fleet-api.prd.na.vn.cloud.teslamotors.com',
    scopes: ['openid', 'offline_access', 'vehicle_device_data', 'vehicle_cmds', 'vehicle_charging_cmds'],
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'tesla_driving_metrics',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'change-this-secret',
  },

  // CORS Configuration
  cors: {
    origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  // API Configuration
  api: {
    pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '10000'),
    maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY || '1000'),
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required configuration
const requiredConfig = [
  'tesla.clientId',
  'tesla.clientSecret',
  'tesla.redirectUri',
];

const missingConfig = requiredConfig.filter(key => {
  const value = key.split('.').reduce((obj, k) => obj?.[k], config);
  return !value;
});

if (missingConfig.length > 0) {
  throw new Error(`Missing required configuration: ${missingConfig.join(', ')}`);
}

export default config;
