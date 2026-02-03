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

#### Telemetry (recent / ingest)

```http
GET /api/v1/telemetry/recent?limit=50
Authorization: Bearer <jwt_token>
```

Returns recent telemetry for the authenticated user (from polling + ingest).

```http
POST /api/v1/telemetry/ingest
Content-Type: application/json
# Optional: X-Telemetry-Secret: <TELEMETRY_INGEST_SECRET>

{"vin": "5YJ3...", "speed_kmh": 60, "battery_level": 80, ...}
```

Accepts telemetry payloads (for testing or relay). If `TELEMETRY_INGEST_SECRET` is set, the request must include the same value in `X-Telemetry-Secret`.

---

## Telemetry Setup

### Current architecture (audit)

| Question | Answer |
|----------|--------|
| **Do we have telemetry endpoints?** | Yes: `GET /api/v1/telemetry/recent` (auth) and `POST /api/v1/telemetry/ingest` (public or secret). |
| **Poll vs push?** | **Poll only today.** The app (and dashboard refresh) calls `GET /api/v1/vehicles/:id/metrics`; the backend then calls Tesla’s `vehicle_data` endpoint and returns processed metrics. Each successful metrics response is also stored in `telemetry_data`. We do **not** receive Tesla Fleet Telemetry push (WebSocket) unless you run Tesla’s fleet-telemetry server and optionally relay to our ingest. |
| **Where are tokens / vehicle IDs / VINs stored?** | Postgres: `tesla_tokens` (per user), `vehicles` (id, user_id, tesla_vehicle_id, vin, display_name, …). |
| **What does the iOS app call for “telemetry”?** | It does **not** call a dedicated telemetry API. It calls `GET /vehicles` and `GET /vehicles/:id/metrics`; the backend fetches Tesla `vehicle_data` and now also writes a row into `telemetry_data` per request. Use `GET /telemetry/recent` (with JWT) to confirm stored data. |

### Tesla Fleet Telemetry (plain English)

- **Does telemetry require a Telemetry Config?** Yes. You send a **Fleet Telemetry config** to each vehicle (signed with your **private key**) so the vehicle knows **where** to stream (host + TLS) and **what** to send (fields + intervals). Config is sent via Tesla’s **fleet_telemetry_config** endpoint (through the [vehicle-command](https://github.com/teslamotors/vehicle-command) HTTP proxy).
- **Does it require a public HTTPS ingestion endpoint?** Tesla does **not** POST to a REST URL. Vehicles open a **WebSocket** to a **Fleet Telemetry server** (TLS). You must run Tesla’s [fleet-telemetry](https://github.com/teslamotors/fleet-telemetry) server (Go) or a compatible one. That server can then dispatch to Kafka/Kinesis/Logger or a custom relay that POSTs to our `/telemetry/ingest` if you want.
- **Partner registration / public key / signing?** Yes. You must: (1) Register with the Fleet API [register](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#register) endpoint; (2) Host your **public key** at `https://<your-domain>/.well-known/appspecific/com.tesla.3p.public-key.pem`; (3) Use the **vehicle-command** proxy with your **private key** to sign the fleet_telemetry_config sent to vehicles.
- **Does the user need to enable something?** Yes. The user must add your app as a **virtual key** on the vehicle (link: `https://www.tesla.com/_ak/<developer-domain>`). On some older S/X, a “Allow Third-Party App Data Streaming” toggle must be on. Vehicle firmware must be 2024.26+ (or 2023.20.6+ for legacy cert flow).
- **Prerequisites (scopes/permissions):** Same OAuth scopes you use for vehicle data; partner registration and public key are required for Fleet Telemetry config. Verify: call Fleet API `fleet_status` and check that the app’s key is on the vehicle.

### What this backend implements

1. **Poll-based telemetry:** Every successful `GET /vehicles/:id/metrics` inserts a row into `telemetry_data`. The iOS app gets data by calling that endpoint (and refresh); no separate “telemetry” call.
2. **GET /api/v1/telemetry/recent:** Returns recent rows from `telemetry_data` (for the authenticated user) and from `telemetry_events` (ingest). Use this to confirm data is being stored.
3. **POST /api/v1/telemetry/ingest:** Public HTTPS endpoint that accepts JSON and stores it in `telemetry_events`. Use for: (a) curl/testing, (b) a future relay from a Fleet Telemetry dispatcher. Optional: set `TELEMETRY_INGEST_SECRET` and send `X-Telemetry-Secret` to protect the endpoint.

### Tesla Developer Portal checklist

- [ ] **Redirect URI:** Exactly one of your app’s Redirect URIs (e.g. `https://<your-app>.up.railway.app/api/v1/auth/tesla/callback`).
- [ ] **Allowed Origin(s):** Your backend domain, e.g. `https://tesla-backend-production.up.railway.app` (same host as redirect, no path).
- [ ] **Virtual key domain:** Users add the key via `https://www.tesla.com/_ak/<developer-domain>`. `<developer-domain>` must match the host you use for Fleet API registration (same as Allowed Origin host).
- [ ] **Telemetry “destination” URL:** Tesla does **not** ask for a “telemetry URL” in the portal. The destination is set in the **Fleet Telemetry config** you send to the vehicle (host + port + TLS). That host must be where your **Fleet Telemetry server** (Tesla’s Go server) is running, not necessarily this Node app. If you only use polling, you don’t configure a telemetry destination.

### Railway URLs (example)

- Base: `https://tesla-backend-production.up.railway.app`
- Telemetry ingest: `https://tesla-backend-production.up.railway.app/api/v1/telemetry/ingest`
- Telemetry recent (auth): `https://tesla-backend-production.up.railway.app/api/v1/telemetry/recent`

### How to verify end-to-end

**A) Prove polling stores telemetry**

1. Log in with the iOS app and open the dashboard (so the app calls `/vehicles` and `/vehicles/:id/metrics`).
2. Call `GET /api/v1/telemetry/recent` with your JWT. You should see `from_polling` entries with your vehicle and recent timestamps.
3. If `from_polling` is empty: ensure you’re not in mock mode (or that mock returns data), and that `/vehicles/:id/metrics` returns 200; check server logs for “Failed to store telemetry_data snapshot”.

**B) Prove ingest works**

```bash
curl -X POST https://<your-backend>.up.railway.app/api/v1/telemetry/ingest \
  -H "Content-Type: application/json" \
  -d '{"vin":"5YJ3TEST1234567890","speed_kmh":50,"battery_level":85}'
```

Then call `GET /api/v1/telemetry/recent` (with JWT); you should see the payload under `from_ingest`. Check server logs for a structured log line like `"message":"Telemetry ingest accepted"`.

**C) Fleet Telemetry push (optional)**

To receive **push** telemetry from vehicles you must run Tesla’s [fleet-telemetry](https://github.com/teslamotors/fleet-telemetry) server (Go), configure TLS and dispatchers, register with Fleet API, host the public key, add the virtual key to the vehicle, and send a signed fleet_telemetry_config to each vehicle. Then you can optionally add a dispatcher that POSTs to this backend’s `/telemetry/ingest`.

---

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
│   │   ├── authController.js    # Authentication logic
│   │   ├── vehicleController.js # Vehicle data logic
│   │   ├── partnerController.js # Partner / virtual key
│   │   └── telemetryController.js # Telemetry ingest & recent
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
│   │   ├── vehicleRoutes.js    # Vehicle endpoints
│   │   ├── partnerRoutes.js    # Partner / virtual key URL
│   │   └── telemetryRoutes.js  # Telemetry ingest & recent
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
