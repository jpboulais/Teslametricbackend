# Tesla Driving Metrics - Backend API

Node.js backend service for the Tesla EV Driving Metrics iOS app. Provides REST API endpoints for Tesla OAuth authentication, vehicle data fetching, and driving metrics calculation.

## 🏗️ Architecture

```
Backend Service (Node.js + Express)
├── Tesla OAuth 2.0 Authentication
├── Tesla Fleet API Integration
├── PostgreSQL Database
└── REST API Endpoints
```

## 📋 Prerequisites

Before running the backend, ensure you have:

- **Node.js 18+** installed
- **PostgreSQL 14+** installed and running
- **Tesla API credentials** (Client ID and Client Secret)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your credentials:

```bash
cp env.example .env
```

Edit `.env` and ensure these are set correctly:

```env
# Tesla API credentials (already configured)
TESLA_CLIENT_ID=2f74f070-ee5c-4d14-a5d3-2cb48dede96c
TESLA_CLIENT_SECRET=ta-secret.!1^HpGhJerArNHg@

# Update if using different ports
PORT=3000

# Update database credentials if needed
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tesla_driving_metrics
DB_USER=postgres
DB_PASSWORD=postgres
```

### 3. Set Up Database

Create the PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE tesla_driving_metrics;

# Exit
\q
```

Run migrations to create tables:

```bash
npm run db:migrate
```

### 4. Start the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The server will start on `http://localhost:3000`

### 5. Test the API

Check if the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-28T...",
  "environment": "development"
}
```

## 📚 API Endpoints

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### Initiate OAuth Flow

```http
GET /api/v1/auth/tesla/login
```

Returns Tesla authorization URL to redirect user to.

**Response:**

```json
{
  "success": true,
  "authUrl": "https://auth.tesla.com/oauth2/v3/authorize?...",
  "message": "Redirect user to authUrl to complete Tesla authentication"
}
```

#### OAuth Callback

```http
GET /api/v1/auth/tesla/callback?code=xxx&state=xxx
```

Handles OAuth callback and returns JWT token.

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Tesla User"
  }
}
```

#### Refresh Token

```http
POST /api/v1/auth/refresh
Authorization: Bearer <jwt_token>
```

Refreshes the Tesla access token.

#### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <jwt_token>
```

Revokes Tesla tokens and logs out user.

#### Auth Status

```http
GET /api/v1/auth/status
Authorization: Bearer <jwt_token>
```

Gets current authentication status.

### Vehicle Endpoints

#### Get All Vehicles

```http
GET /api/v1/vehicles
Authorization: Bearer <jwt_token>
```

Returns all vehicles for the authenticated user.

**Response:**

```json
{
  "success": true,
  "vehicles": [
    {
      "id": "uuid",
      "tesla_vehicle_id": "1234567890",
      "vin": "5YJ3E1EA...",
      "display_name": "My Tesla",
      "model": "Model 3",
      "year": 2023,
      "state": "online"
    }
  ]
}
```

#### Get Vehicle Data

```http
GET /api/v1/vehicles/:vehicleId
Authorization: Bearer <jwt_token>
```

Returns detailed data for a specific vehicle.

#### Get Vehicle Metrics

```http
GET /api/v1/vehicles/:vehicleId/metrics?period=trip
Authorization: Bearer <jwt_token>
```

Returns processed driving metrics for the app.

**Query Parameters:**

- `period` - `trip`, `charge`, or `all-time`

**Response:**

```json
{
  "success": true,
  "metrics": {
    "current": {
      "speed": 100,
      "batteryLevel": 90,
      "shiftState": "D"
    },
    "liveConsumption": {
      "rate": 192,
      "efficiency": 70
    },
    "averageEfficiency": {
      "efficiency": 81,
      "distance": 100
    },
    "energyUsage": {
      "total": 20,
      "avgConsumption": 180
    }
  }
}
```

#### Wake Up Vehicle

```http
POST /api/v1/vehicles/:vehicleId/wake
Authorization: Bearer <jwt_token>
```

Wakes up a sleeping vehicle.

## 🗄️ Database Schema

### Tables

- **users** - User accounts
- **tesla_tokens** - OAuth tokens
- **vehicles** - Vehicle information
- **trips** - Trip data with metrics
- **telemetry_data** - Time-series vehicle data

See `src/database/schema.sql` for full schema details.

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── config.js           # Configuration management
│   ├── controllers/
│   │   ├── authController.js   # Authentication logic
│   │   └── vehicleController.js # Vehicle data logic
│   ├── database/
│   │   ├── db.js               # Database connection
│   │   ├── schema.sql          # Database schema
│   │   └── migrate.js          # Migration script
│   ├── middleware/
│   │   └── auth.js             # JWT authentication
│   ├── models/
│   │   ├── User.js             # User model
│   │   ├── TeslaToken.js       # Token model
│   │   └── Vehicle.js          # Vehicle model
│   ├── routes/
│   │   ├── authRoutes.js       # Auth endpoints
│   │   └── vehicleRoutes.js    # Vehicle endpoints
│   ├── services/
│   │   ├── teslaAuthService.js # Tesla OAuth service
│   │   └── teslaApiService.js  # Tesla API client
│   └── server.js               # Express server
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies
└── README.md                   # This file
```

## 🔧 Development

### Available Scripts

```bash
# Start server in development mode (auto-reload)
npm run dev

# Start server in production mode
npm start

# Run database migrations
npm run db:migrate

# Run tests (coming soon)
npm test
```

### Environment Variables

See `env.example` for all available configuration options.

### Database Migrations

To reset and recreate the database:

```bash
# Drop and recreate tables
npm run db:migrate
```

## 🔐 Security

### Token Management

- Tesla OAuth tokens are stored securely in PostgreSQL
- Access tokens are automatically refreshed when expired
- JWT tokens are used for app authentication
- Tokens are revoked on logout

### Best Practices

- Never commit `.env` file
- Use strong secrets in production
- Enable HTTPS in production
- Implement rate limiting (already configured)
- Validate all inputs (use express-validator)

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check if PostgreSQL is running
pg_isready

# Verify credentials in .env
cat .env | grep DB_
```

### Tesla API Errors

- **401 Unauthorized:** Token expired, try refreshing
- **404 Not Found:** Check vehicle ID
- **408 Request Timeout:** Vehicle may be asleep, use wake endpoint
- **429 Too Many Requests:** Rate limit exceeded, wait before retrying

### Common Issues

**"Missing required configuration"**

- Ensure all Tesla credentials are set in `.env`

**"Database query error"**

- Run migrations: `npm run db:migrate`
- Check database credentials

**"Failed to fetch vehicles"**

- Verify Tesla token is valid
- Try refreshing token: `POST /api/v1/auth/refresh`

## 📊 API Rate Limits

Tesla Fleet API has usage-based pricing:

- **$10/month free credit** for personal use
- Data requests: 500 requests/$1
- Commands: 1,000 requests/$1
- Wake requests: 50 requests/$1

Be mindful of polling frequency to stay within limits.

## 🚀 Deployment

### Production Checklist

- [ ] Update `.env` with production values
- [ ] Change `NODE_ENV` to `production`
- [ ] Use strong JWT and session secrets
- [ ] Set up hosted PostgreSQL (AWS RDS, Render, etc.)
- [ ] Configure CORS for your domain
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Recommended Hosting

- **Backend:** Railway, Render, AWS EC2/ECS
- **Database:** AWS RDS, Render PostgreSQL, Railway
- **Domain:** Custom domain with SSL certificate

## 📝 Next Steps

1. ✅ Backend service implemented
2. 📱 Build iOS app (Phase 3)
3. 🎨 Implement UI components (Phase 4)
4. 🧮 Add advanced metrics calculation (Phase 5)
5. 🧪 Add comprehensive testing (Phase 6)
6. 🚀 Deploy to production (Phase 7)

## 📖 Resources

- **Tesla Fleet API Docs:** https://developer.tesla.com/docs/fleet-api
- **OAuth Guide:** https://developer.tesla.com/docs/fleet-api/authentication/oauth
- **Express.js:** https://expressjs.com
- **PostgreSQL:** https://www.postgresql.org/docs

## 🆘 Support

For issues or questions:

1. Check the troubleshooting section
2. Review Tesla API documentation
3. Check server logs for detailed errors

---

**Version:** 1.0.0  
**Last Updated:** January 28, 2026
