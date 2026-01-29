import express from 'express';
import * as vehicleController from '../controllers/vehicleController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /vehicles
 * @desc    Get all vehicles for authenticated user
 * @access  Private
 */
router.get('/', authenticateToken, vehicleController.getVehicles);

/**
 * @route   GET /vehicles/:vehicleId
 * @desc    Get specific vehicle data
 * @access  Private
 */
router.get('/:vehicleId', authenticateToken, vehicleController.getVehicleData);

/**
 * @route   GET /vehicles/:vehicleId/metrics
 * @desc    Get vehicle metrics (processed data)
 * @access  Private
 * @query   period - 'trip', 'charge', or 'all-time'
 */
router.get('/:vehicleId/metrics', authenticateToken, vehicleController.getVehicleMetrics);

/**
 * @route   POST /vehicles/:vehicleId/wake
 * @desc    Wake up a vehicle
 * @access  Private
 */
router.post('/:vehicleId/wake', authenticateToken, vehicleController.wakeUpVehicle);

export default router;
