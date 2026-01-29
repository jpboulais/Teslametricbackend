import express from 'express';
import * as partnerController from '../controllers/partnerController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /partner/register
 * @desc    Register with Tesla Fleet API
 * @access  Private
 */
router.post('/register', authenticateToken, partnerController.registerPartner);

/**
 * @route   GET /partner/status
 * @desc    Check registration status
 * @access  Private
 */
router.get('/status', authenticateToken, partnerController.checkRegistration);

export default router;
