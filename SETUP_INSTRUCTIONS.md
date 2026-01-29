# Backend Setup Instructions

Quick guide to get the Tesla Driving Metrics backend running.

## Prerequisites Checklist

- [ ] Node.js 18 or higher installed
- [ ] PostgreSQL 14 or higher installed
- [ ] Tesla API credentials obtained (Phase 1 complete)

## Step-by-Step Setup

### Step 1: Install Node.js (if needed)

**macOS:**

```bash
# Using Homebrew
brew install node

# Or download from: https://nodejs.org
```

**Check installation:**

```bash
node --version  # Should show v18 or higher
npm --version
```

### Step 2: Install PostgreSQL (if needed)

**macOS:**

```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14

# Create default user (if needed)
createuser -s postgres
```

**Verify PostgreSQL is running:**

```bash
pg_isready
# Expected: /tmp:5432 - accepting connections
```

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
```

This will install all required packages (~30 seconds).

### Step 4: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In the PostgreSQL prompt:
CREATE DATABASE tesla_driving_metrics;
\q
```

### Step 5: Configure Environment Variables

The `.env` file is already created with your Tesla credentials. Verify it:

```bash
cat .env | grep TESLA_CLIENT_ID
# Should show: TESLA_CLIENT_ID=2f74f070-ee5c-4d14-a5d3-2cb48dede96c
```

If you need to change database credentials, edit `.env`:

```bash
nano .env
# Update DB_USER, DB_PASSWORD if needed
```

### Step 6: Run Database Migrations

```bash
npm run db:migrate
```

Expected output:

```
🚀 Starting database migration...
✓ Connected to PostgreSQL database
✅ Database migration completed successfully!
Created tables:
  - users
  - tesla_tokens
  - vehicles
  - trips
  - telemetry_data
```

### Step 7: Start the Server

**Development mode (recommended for now):**

```bash
npm run dev
```

Expected output:

```
🚀 Tesla Driving Metrics Backend Server
========================================
Environment: development
Server running on port 3000
API base path: /api/v1

Endpoints:
  - Health check: http://localhost:3000/health
  - Auth: http://localhost:3000/api/v1/auth
  - Vehicles: http://localhost:3000/api/v1/vehicles

========================================
```

### Step 8: Test the API

In a new terminal window:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "success": true,
#   "status": "healthy",
#   "timestamp": "...",
#   "environment": "development"
# }
```

## 🎉 Success!

Your backend is now running and ready to:

1. Authenticate with Tesla
2. Fetch vehicle data
3. Calculate driving metrics

## Next Steps

### Test OAuth Flow

```bash
# Get Tesla login URL
curl http://localhost:3000/api/v1/auth/tesla/login
```

This will return an `authUrl`. Open it in a browser to:

1. Sign in with your Tesla account
2. Authorize the app
3. Get redirected back with authentication token

### Common Commands

```bash
# Stop the server
# Press Ctrl+C in the terminal running npm run dev

# Restart the server
npm run dev

# Check logs
# Logs appear in the terminal running the server

# Reset database
npm run db:migrate
```

## Troubleshooting

### "Connection refused" to PostgreSQL

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start it if stopped
brew services start postgresql@14
```

### "Port 3000 already in use"

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port in .env
echo "PORT=3001" >> .env
```

### "ECONNREFUSED" database error

Check database credentials in `.env`:

```bash
grep DB_ .env
```

Test database connection:

```bash
psql -U postgres -d tesla_driving_metrics -c "SELECT 1;"
```

### Permission errors

```bash
# Give postgres user permissions
psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;"
```

## Development Tips

### Keep server running

Use `npm run dev` (with nodemon) to auto-reload on file changes.

### View database data

```bash
psql -U postgres tesla_driving_metrics

# List tables
\dt

# Query users
SELECT * FROM users;

# Query vehicles
SELECT * FROM vehicles;

# Exit
\q
```

### API Testing Tools

**cURL (command line):**

```bash
curl -X GET http://localhost:3000/api/v1/auth/tesla/login
```

**Postman (GUI):**

- Download from: https://www.postman.com
- Import endpoints and test interactively

**HTTPie (better cURL):**

```bash
brew install httpie
http GET localhost:3000/health
```

## Ready for Phase 3?

With the backend running, you're ready to:

1. Build the iOS app
2. Implement the UI
3. Connect to this backend API
4. Display real-time Tesla data!

---

**Need Help?** See `README.md` for detailed API documentation and troubleshooting.
