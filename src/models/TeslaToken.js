import { query } from '../database/db.js';

class TeslaToken {
  /**
   * Store or update Tesla tokens for a user
   */
  static async upsert(userId, tokenData) {
    const sql = `
      INSERT INTO tesla_tokens (
        user_id, 
        access_token, 
        refresh_token, 
        token_type, 
        expires_at, 
        scopes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_type = EXCLUDED.token_type,
        expires_at = EXCLUDED.expires_at,
        scopes = EXCLUDED.scopes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await query(sql, [
      userId,
      tokenData.accessToken,
      tokenData.refreshToken,
      tokenData.tokenType || 'Bearer',
      tokenData.expiresAt,
      tokenData.scope || [],
    ]);
    
    return result.rows[0];
  }

  /**
   * Get tokens for a user
   */
  static async findByUserId(userId) {
    const sql = 'SELECT * FROM tesla_tokens WHERE user_id = $1';
    const result = await query(sql, [userId]);
    return result.rows[0];
  }

  /**
   * Update access token (after refresh)
   */
  static async updateAccessToken(userId, accessToken, expiresAt) {
    const sql = `
      UPDATE tesla_tokens
      SET access_token = $1,
          expires_at = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3
      RETURNING *
    `;
    const result = await query(sql, [accessToken, expiresAt, userId]);
    return result.rows[0];
  }

  /**
   * Check if token is expired
   */
  static isExpired(token) {
    if (!token || !token.expires_at) return true;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return new Date(token.expires_at) <= fiveMinutesFromNow;
  }

  /**
   * Delete tokens for a user
   */
  static async delete(userId) {
    const sql = 'DELETE FROM tesla_tokens WHERE user_id = $1 RETURNING *';
    const result = await query(sql, [userId]);
    return result.rows[0];
  }

  /**
   * Get all expired tokens
   */
  static async getExpiredTokens() {
    const sql = 'SELECT * FROM tesla_tokens WHERE expires_at <= CURRENT_TIMESTAMP';
    const result = await query(sql);
    return result.rows;
  }
}

export default TeslaToken;
