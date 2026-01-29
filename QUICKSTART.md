# 🚀 Quick Start Guide

Get your Tesla backend running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js (need v18+)
node --version

# Check npm
npm --version

# Check PostgreSQL
pg_isready
```

If any are missing, see `SETUP_INSTRUCTIONS.md` for installation.

## 5-Minute Setup

### 1. Install Dependencies (30 seconds)

```bash
cd backend
npm install
```

### 2. Create Database (30 seconds)

```bash
# Create the database
createdb tesla_driving_metrics

# Or if you need to use postgres user:
psql -U postgres -c "CREATE DATABASE tesla_driving_metrics;"
```

### 3. Run Migrations (10 seconds)

```bash
npm run db:migrate
```

### 4. Start Server (5 seconds)

```bash
npm run dev
```

You should see:

```
🚀 Tesla Driving Metrics Backend Server
========================================
Environment: development
Server running on port 3000
```

### 5. Test It Works (5 seconds)

Open a new terminal:

```bash
curl http://localhost:3000/health
```

Expected:

```json
{
  "success": true,
  "status": "healthy"
}
```

## ✅ You're Done!

Your backend is running and ready for:
- Tesla OAuth authentication
- Vehicle data fetching
- Driving metrics calculation

## Next Steps

### Test OAuth Flow

1. Get auth URL:
   ```bash
   curl http://localhost:3000/api/v1/auth/tesla/login
   ```

2. Open the returned `authUrl` in your browser

3. Sign in with your Tesla account

4. You'll receive a JWT token to use with the API!

### Useful Commands

```bash
# Stop server
Ctrl+C

# Restart server
npm run dev

# Reset database
npm run db:migrate

# View logs
# Logs appear in terminal running the server
```

## Troubleshooting

**Can't connect to PostgreSQL?**
```bash
brew services start postgresql@14
```

**Port 3000 in use?**
```bash
# Change port in .env
echo "PORT=3001" >> .env
```

**Database errors?**
```bash
# Re-run migrations
npm run db:migrate
```

## Need More Details?

- **Full setup:** See `SETUP_INSTRUCTIONS.md`
- **API docs:** See `README.md`
- **Issues:** Check troubleshooting sections

---

**Ready to build the iOS app?** Your backend is ready to go! 🎉
