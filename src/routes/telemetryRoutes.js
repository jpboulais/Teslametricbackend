import express from 'express';
import * as telemetryController from '../controllers/telemetryController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /telemetry/ingest
 * @desc    Receive telemetry payloads (public; optional X-Telemetry-Secret if TELEMETRY_INGEST_SECRET set)
 * @access  Public (or secret-based)
 */
router.post('/ingest', telemetryController.ingest);

/**
 * @route   GET /telemetry/recent
 * @desc    Get recent telemetry for the authenticated user (from polling + ingest)
 * @access  Private (JWT)
 */
router.get('/recent', authenticateToken, telemetryController.recent);

export default router;
