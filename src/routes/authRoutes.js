import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /auth/tesla/login
 * @desc    Initiate Tesla OAuth flow
 * @access  Public
 */
router.get('/tesla/login', authController.login);

/**
 * @route   GET /auth/tesla/callback
 * @desc    Handle OAuth callback from Tesla
 * @access  Public
 */
router.get('/tesla/callback', authController.callback);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh Tesla access token
 * @access  Private
 */
router.post('/refresh', authenticateToken, authController.refresh);

/**
 * @route   POST /auth/logout
 * @desc    Logout and revoke tokens
 * @access  Private
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   GET /auth/status
 * @desc    Get authentication status
 * @access  Private
 */
router.get('/status', authenticateToken, authController.status);

export default router;
