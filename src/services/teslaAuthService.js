import axios from 'axios';
import crypto from 'crypto';
import config from '../config/config.js';

class TeslaAuthService {
  constructor() {
    this.authBaseUrl = config.tesla.authBaseUrl;
    // Token exchange/refresh must use fleet-auth and include audience for Fleet API (Tesla docs)
    this.tokenBaseUrl = config.tesla.fleetAuthUrl || this.authBaseUrl;
    this.fleetApiAudience = config.tesla.fleetApiBaseUrl || 'https://fleet-api.prd.na.vn.cloud.tesla.com';
    this.clientId = config.tesla.clientId;
    this.clientSecret = config.tesla.clientSecret;
    this.redirectUri = config.tesla.redirectUri;
    this.scopes = config.tesla.scopes;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    
    return { verifier, challenge };
  }

  /**
   * Generate state parameter for OAuth flow
   */
  generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(state, codeChallenge) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.authBaseUrl}/oauth2/v3/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, codeVerifier) {
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
        audience: this.fleetApiAudience,
      });
      const response = await axios.post(
        `${this.tokenBaseUrl}/oauth2/v3/token`,
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return this.parseTokenResponse(response.data);
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        audience: this.fleetApiAudience,
      });
      const response = await axios.post(
        `${this.tokenBaseUrl}/oauth2/v3/token`,
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return this.parseTokenResponse(response.data);
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Parse token response and calculate expiration
   */
  parseTokenResponse(data) {
    const expiresIn = data.expires_in || 3600; // Default 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: expiresIn,
      expiresAt: expiresAt,
      scope: data.scope ? data.scope.split(' ') : [],
    };
  }

  /**
   * Check if token is expired or will expire soon (within 5 minutes)
   */
  isTokenExpired(expiresAt) {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return new Date(expiresAt) <= fiveMinutesFromNow;
  }

  /**
   * Revoke token
   */
  async revokeToken(token) {
    try {
      await axios.post(
        `${this.authBaseUrl}/oauth2/v3/revoke`,
        {
          client_id: this.clientId,
          token: token,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (error) {
      console.error('Error revoking token:', error.response?.data || error.message);
      return false;
    }
  }
}

export default new TeslaAuthService();
