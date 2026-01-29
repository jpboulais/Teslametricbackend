import { query } from '../database/db.js';

class Vehicle {
  /**
   * Create or update a vehicle
   */
  static async upsert(vehicleData) {
    const sql = `
      INSERT INTO vehicles (
        user_id,
        tesla_vehicle_id,
        vin,
        display_name,
        model,
        year,
        color,
        state,
        battery_capacity_kwh,
        epa_range_km,
        last_seen_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (vin)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        state = EXCLUDED.state,
        last_seen_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await query(sql, [
      vehicleData.userId,
      vehicleData.teslaVehicleId,
      vehicleData.vin,
      vehicleData.displayName,
      vehicleData.model,
      vehicleData.year,
      vehicleData.color,
      vehicleData.state,
      vehicleData.batteryCapacityKwh,
      vehicleData.epaRangeKm,
    ]);

    return result.rows[0];
  }

  /**
   * Find vehicle by ID
   */
  static async findById(id) {
    const sql = 'SELECT * FROM vehicles WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  /**
   * Find vehicle by VIN
   */
  static async findByVin(vin) {
    const sql = 'SELECT * FROM vehicles WHERE vin = $1';
    const result = await query(sql, [vin]);
    return result.rows[0];
  }

  /**
   * Find vehicles by user ID
   */
  static async findByUserId(userId) {
    const sql = 'SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * Find vehicle by Tesla vehicle ID and user ID
   */
  static async findByTeslaVehicleId(userId, teslaVehicleId) {
    const sql = 'SELECT * FROM vehicles WHERE user_id = $1 AND tesla_vehicle_id = $2';
    const result = await query(sql, [userId, teslaVehicleId]);
    return result.rows[0];
  }

  /**
   * Update vehicle state
   */
  static async updateState(id, state) {
    const sql = `
      UPDATE vehicles
      SET state = $1,
          last_seen_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [state, id]);
    return result.rows[0];
  }

  /**
   * Delete vehicle
   */
  static async delete(id) {
    const sql = 'DELETE FROM vehicles WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }
}

export default Vehicle;
