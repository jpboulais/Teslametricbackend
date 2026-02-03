import pool from '../database/db.js';
import config from '../config/config.js';

const TELEMETRY_INGEST_SECRET = process.env.TELEMETRY_INGEST_SECRET;

/**
 * POST /telemetry/ingest
 * Public HTTPS endpoint for receiving telemetry payloads.
 * Tesla Fleet Telemetry uses a WebSocket server (see Tesla's fleet-telemetry repo), not HTTP POST.
 * This endpoint is for: (1) testing that the route is reachable, (2) future relay from a Fleet Telemetry
 * dispatcher that POSTs to us, or (3) manual/curl testing.
 * Optional: set TELEMETRY_INGEST_SECRET and send header X-Telemetry-Secret to match.
 */
export const ingest = async (req, res) => {
  const requestId = `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const log = (level, message, meta = {}) => {
    const entry = {
      ts: new Date().toISOString(),
      level,
      message,
      requestId,
      ...meta,
    };
    console.log(JSON.stringify(entry));
  };

  try {
    if (TELEMETRY_INGEST_SECRET) {
      const secret = req.headers['x-telemetry-secret'];
      if (secret !== TELEMETRY_INGEST_SECRET) {
        log('warn', 'Telemetry ingest rejected: missing or invalid X-Telemetry-Secret');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
    }

    const body = req.body;
    if (!body || typeof body !== 'object') {
      log('warn', 'Telemetry ingest rejected: body must be a JSON object');
      return res.status(400).json({
        success: false,
        error: 'Body must be a JSON object',
      });
    }

    const vin = body.vin || body.VIN || null;
    const payload = { ...body, _received_at: new Date().toISOString() };

    await pool.query(
      `INSERT INTO telemetry_events (vin, source, payload) VALUES ($1, $2, $3)`,
      [vin, body.source || 'ingest', JSON.stringify(payload)]
    );

    log('info', 'Telemetry ingest accepted', {
      vin: vin || '(none)',
      keys: Object.keys(body).filter(k => !k.startsWith('_')).slice(0, 10),
    });

    res.status(200).json({
      success: true,
      message: 'Telemetry received',
      requestId,
    });
  } catch (error) {
    log('error', 'Telemetry ingest failed', { error: error.message });
    console.error('Ensure migration 002_telemetry_events.sql has been run (telemetry_events table).');
    res.status(500).json({
      success: false,
      error: 'Failed to store telemetry',
      requestId,
    });
  }
};

/**
 * GET /telemetry/recent
 * Returns recent telemetry for the authenticated user (from telemetry_data and telemetry_events).
 * Used to verify that telemetry is being stored (from polling or ingest).
 */
export const recent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const fromData = await pool.query(
      `SELECT td.id, td.vehicle_id, v.display_name, v.vin, td.timestamp, td.speed_kmh, td.battery_level, td.odometer_km, td.shift_state
       FROM telemetry_data td
       JOIN vehicles v ON v.id = td.vehicle_id
       WHERE v.user_id = $1
       ORDER BY td.timestamp DESC
       LIMIT $2`,
      [userId, limit]
    );

    const fromEvents = await pool.query(
      `SELECT id, vin, received_at, source, payload
       FROM telemetry_events
       ORDER BY received_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      from_polling: fromData.rows,
      from_ingest: fromEvents.rows,
      meta: {
        limit,
        from_polling_count: fromData.rows.length,
        from_ingest_count: fromEvents.rows.length,
      },
    });
  } catch (error) {
    console.error('Error fetching recent telemetry:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch recent telemetry',
    });
  }
};
