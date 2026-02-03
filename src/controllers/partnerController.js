import axios from 'axios';
import config from '../config/config.js';
import { registerPartnerAccount, getPartnerToken } from '../services/teslaPartnerService.js';

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
 * Register application with Tesla Fleet API (virtual key).
 * Uses partner token (client_credentials), not user token. Domain must match Allowed Origin in Tesla Developer Portal.
 */
export const registerPartner = async (req, res) => {
  try {
    const data = await registerPartnerAccount();
    console.log('✅ Successfully registered with Tesla Fleet API');
    res.json({
      success: true,
      message: 'Successfully registered with Tesla Fleet API',
      data,
    });
  } catch (error) {
    console.error('Error registering with Tesla:', error.response?.data || error.message);
    if (error.response?.status === 409) {
      return res.json({
        success: true,
        message: 'Already registered with Tesla Fleet API',
        data: error.response?.data,
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
/**
 * Check if this app is registered with Tesla (virtual key). Uses partner token.
 */
export const checkRegistration = async (req, res) => {
  try {
    const token = await getPartnerToken();
    const domain = config.tesla.developerDomain;
    if (!domain) {
      return res.status(503).json({ success: false, error: 'Developer domain not configured' });
    }
    const response = await axios.get(
      `${config.tesla.fleetApiBaseUrl}/api/1/partner_accounts/public_key`,
      { params: { domain }, headers: { Authorization: `Bearer ${token}` } }
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
      details: error.response?.data?.error || error.message,
    });
  }
};
