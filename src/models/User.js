import { query } from '../database/db.js';

class User {
  /**
   * Create a new user
   */
  static async create({ email, name, teslaUserId }) {
    const sql = `
      INSERT INTO users (email, name, tesla_user_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await query(sql, [email, name, teslaUserId]);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = $1';
    const result = await query(sql, [email]);
    return result.rows[0];
  }

  /**
   * Find user by Tesla user ID
   */
  static async findByTeslaUserId(teslaUserId) {
    const sql = 'SELECT * FROM users WHERE tesla_user_id = $1';
    const result = await query(sql, [teslaUserId]);
    return result.rows[0];
  }

  /**
   * Update user
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.teslaUserId) {
      fields.push(`tesla_user_id = $${paramCount++}`);
      values.push(data.teslaUserId);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const sql = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(id) {
    const sql = `
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  /**
   * Delete user
   */
  static async delete(id) {
    const sql = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }
}

export default User;
