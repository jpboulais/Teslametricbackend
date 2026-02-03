import axios from 'axios';
import config from '../config/config.js';
import TeslaToken from '../models/TeslaToken.js';

/** Base URL for Tesla virtual key flow (user adds app as key on vehicle) */
const VIRTUAL_KEY_BASE = 'https://www.tesla.com/_ak';

/**
 * Get the virtual key URL for this application.
 * User opens this in the Tesla app to add the app as a virtual key on their vehicle (required for realtime data and commands).
 * @see https://developer.tesla.com/docs/fleet-api/virtual-keys/overview
 */
export const getVirtualKeyUrl = (req, res) => {
  const domain = config.tesla.developerDomain;
  if (!domain) {
    return res.status(503).json({
      success: false,
      error: 'Virtual key domain not configured (TESLA_DEVELOPER_DOMAIN or derive from TESLA_REDIRECT_URI)',
    });
  }
  const url = `${VIRTUAL_KEY_BASE}/${domain}`;
  res.json({ success: true, url });
};

/**
 * Register application with Tesla Fleet API for a region
 * This is required before accessing Fleet API endpoints
 */
export const registerPartner = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's Tesla tokens
    const tokens = await TeslaToken.findByUserId(userId);
    if (!tokens) {
      return res.status(404).json({
        success: false,
        error: 'No Tesla tokens found. Please login first.',
      });
    }

    // Register with Tesla Fleet API
    const response = await axios.post(
      `${config.tesla.apiBaseUrl}/api/1/partner_accounts`,
      {
        domain: 'localhost:3000'
      },
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Successfully registered with Tesla Fleet API');
    console.log('Registration response:', response.data);

    res.json({
      success: true,
      message: 'Successfully registered with Tesla Fleet API',
      data: response.data,
    });
  } catch (error) {
    console.error('Error registering with Tesla:', error.response?.data || error.message);
    
    // If already registered, that's okay!
    if (error.response?.status === 409) {
      return res.json({
        success: true,
        message: 'Already registered with Tesla Fleet API',
        data: error.response.data,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || 'Failed to register with Tesla Fleet API',
      details: error.message,
    });
  }
};

/**
 * Check registration status
 */
export const checkRegistration = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const tokens = await TeslaToken.findByUserId(userId);
    if (!tokens) {
      return res.status(404).json({
        success: false,
        error: 'No Tesla tokens found',
      });
    }

    // Check if registered
    const response = await axios.get(
      `${config.tesla.apiBaseUrl}/api/1/partner_accounts`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      }
    );

    res.json({
      success: true,
      registered: true,
      data: response.data,
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.json({
        success: true,
        registered: false,
        message: 'Not registered yet',
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to check registration status',
    });
  }
};
