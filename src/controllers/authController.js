import teslaAuthService from '../services/teslaAuthService.js';
import User from '../models/User.js';
import TeslaToken from '../models/TeslaToken.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

// Temporary in-memory store for OAuth state and PKCE (in production, use Redis)
const oauthSessions = new Map();

/**
 * Initiate Tesla OAuth flow
 */
export const login = async (req, res) => {
  try {
    // Generate state and PKCE parameters
    const state = teslaAuthService.generateState();
    const { verifier, challenge } = teslaAuthService.generatePKCE();

    // Store in session (expires after 10 minutes)
    oauthSessions.set(state, {
      codeVerifier: verifier,
      createdAt: Date.now(),
    });

    // Clean up expired sessions
    setTimeout(() => {
      oauthSessions.delete(state);
    }, 10 * 60 * 1000);

    // Get authorization URL
    const authUrl = teslaAuthService.getAuthorizationUrl(state, challenge);

    res.json({
      success: true,
      authUrl,
      message: 'Redirect user to authUrl to complete Tesla authentication',
    });
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate authentication',
    });
  }
};

/**
 * Handle OAuth callback from Tesla
 */
export const callback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Check for OAuth error
    if (error) {
      return res.status(400).json({
        success: false,
        error: `OAuth error: ${error}`,
      });
    }

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing code or state parameter',
      });
    }

    // Retrieve OAuth session
    const session = oauthSessions.get(state);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired state parameter',
      });
    }

    // Exchange code for tokens
    const tokenData = await teslaAuthService.exchangeCodeForToken(
      code,
      session.codeVerifier
    );

    // Clean up session
    oauthSessions.delete(state);

    // Create or update user (for now, using a placeholder email)
    // In production, you'd fetch user info from Tesla API
    const userEmail = `tesla_user_${Date.now()}@tesladriving.app`;
    let user = await User.findByEmail(userEmail);
    
    if (!user) {
      user = await User.create({
        email: userEmail,
        name: 'Tesla User',
        teslaUserId: null, // Will be updated when we fetch user profile
      });
    }

    // Store tokens
    await TeslaToken.upsert(user.id, tokenData);

    // Update last login
    await User.updateLastLogin(user.id);
    
    // Auto-register with Tesla Fleet API only when using Fleet API base (OAuth tokens are for Owner API only)
    const isFleetApi = config.tesla.apiBaseUrl && config.tesla.apiBaseUrl.includes('fleet-api');
    if (isFleetApi) {
      try {
        console.log('🔐 Auto-registering with Tesla Fleet API...');
        const axios = (await import('axios')).default;
        await axios.post(
          `${config.tesla.apiBaseUrl}/api/1/partner_accounts`,
          { domain: 'localhost:3000' },
          {
            headers: {
              'Authorization': `Bearer ${tokenData.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('✅ Successfully registered with Tesla Fleet API');
      } catch (regError) {
        if (regError.response?.status === 409) {
          console.log('ℹ️ Already registered with Tesla Fleet API');
        } else {
          console.warn('⚠️ Fleet API registration failed (might be okay):', regError.response?.data || regError.message);
        }
      }
    }

    // Generate JWT for app authentication
    const appToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Redirect to mobile app with token
    const redirectUrl = `tesladriving://oauth/callback?token=${encodeURIComponent(appToken)}&userId=${user.id}`;
    
    // For mobile app
    res.redirect(redirectUrl);
    
    // Alternative: Return JSON if redirect doesn't work (uncomment below)
    // res.json({
    //   success: true,
    //   token: appToken,
    //   user: {
    //     id: user.id,
    //     email: user.email,
    //     name: user.name,
    //   },
    //   message: 'Authentication successful',
    // });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete authentication',
    });
  }
};

/**
 * Refresh access token
 */
export const refresh = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get current tokens
    const tokens = await TeslaToken.findByUserId(userId);
    if (!tokens) {
      return res.status(404).json({
        success: false,
        error: 'No tokens found for user',
      });
    }

    // Refresh the token
    const newTokenData = await teslaAuthService.refreshAccessToken(
      tokens.refresh_token
    );

    // Update in database
    await TeslaToken.upsert(userId, newTokenData);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
    });
  }
};

/**
 * Logout - revoke tokens
 */
export const logout = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get tokens
    const tokens = await TeslaToken.findByUserId(userId);
    if (tokens) {
      // Revoke access token
      await teslaAuthService.revokeToken(tokens.access_token);
      
      // Delete from database
      await TeslaToken.delete(userId);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
    });
  }
};

/**
 * Get authentication status
 */
export const status = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user and tokens
    const user = await User.findById(userId);
    const tokens = await TeslaToken.findByUserId(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const isAuthenticated = !!tokens;
    const isTokenExpired = tokens ? TeslaToken.isExpired(tokens) : true;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      isAuthenticated,
      needsRefresh: isTokenExpired,
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication status',
    });
  }
};
