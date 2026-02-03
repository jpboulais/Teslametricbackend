/**
 * Tesla Fleet API partner registration (virtual key).
 * Register requires a partner token (client_credentials), not user OAuth token.
 * @see https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
 * @see https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints
 */

import axios from 'axios';
import config from '../config/config.js';

const FLEET_AUTH_URL = config.tesla.fleetAuthUrl || 'https://fleet-auth.prd.vn.cloud.tesla.com';
const FLEET_API_BASE = config.tesla.fleetApiBaseUrl || 'https://fleet-api.prd.na.vn.cloud.teslamotors.com';

/**
 * Get a partner authentication token (client_credentials).
 * Required for POST /api/1/partner_accounts (register).
 */
export async function getPartnerToken() {
  const { clientId, clientSecret } = config.tesla;
  if (!clientId || !clientSecret) {
    throw new Error('TESLA_CLIENT_ID and TESLA_CLIENT_SECRET required for partner registration');
  }
  const response = await axios.post(
    `${FLEET_AUTH_URL}/oauth2/v3/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: FLEET_API_BASE,
      scope: 'openid vehicle_device_data vehicle_cmds vehicle_charging_cmds',
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    }
  );
  return response.data.access_token;
}

/**
 * Register this application with Tesla Fleet API (virtual key).
 * Domain must match Allowed Origin in Tesla Developer Portal.
 * Public key must be hosted at https://<domain>/.well-known/appspecific/com.tesla.3p.public-key.pem
 */
export async function registerPartnerAccount() {
  const domain = config.tesla.developerDomain;
  if (!domain) {
    throw new Error('Developer domain required (set TESLA_DEVELOPER_DOMAIN or TESLA_REDIRECT_URI with host)');
  }
  const token = await getPartnerToken();
  const response = await axios.post(
    `${FLEET_API_BASE}/api/1/partner_accounts`,
    { domain },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
  return response.data;
}
