import axios from 'axios';
import config from '../config/config.js';

class TeslaApiService {
  constructor() {
    this.apiBaseUrl = config.tesla.apiBaseUrl;
  }

  /**
   * Create axios instance with auth token
   */
  createClient(accessToken) {
    return axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Get list of vehicles
   */
  async getVehicles(accessToken) {
    try {
      const client = this.createClient(accessToken);
      const response = await client.get('/api/1/vehicles');
      return response.data.response || [];
    } catch (error) {
      console.error('Error fetching vehicles:', error.response?.data || error.message);
      throw new Error('Failed to fetch vehicles from Tesla API');
    }
  }

  /**
   * Get specific vehicle data
   */
  async getVehicle(accessToken, vehicleId) {
    try {
      const client = this.createClient(accessToken);
      const response = await client.get(`/api/1/vehicles/${vehicleId}`);
      return response.data.response;
    } catch (error) {
      console.error('Error fetching vehicle:', error.response?.data || error.message);
      throw new Error('Failed to fetch vehicle data');
    }
  }

  /**
   * Get vehicle data (includes drive state, charge state, climate state, etc.)
   */
  async getVehicleData(accessToken, vehicleId) {
    try {
      const client = this.createClient(accessToken);
      const response = await client.get(`/api/1/vehicles/${vehicleId}/vehicle_data`);
      return response.data.response;
    } catch (error) {
      console.error('Error fetching vehicle data:', error.response?.data || error.message);
      throw new Error('Failed to fetch vehicle data');
    }
  }

  /**
   * Wake up vehicle (required before fetching data if vehicle is asleep)
   */
  async wakeUpVehicle(accessToken, vehicleId) {
    try {
      const client = this.createClient(accessToken);
      const response = await client.post(`/api/1/vehicles/${vehicleId}/wake_up`);
      return response.data.response;
    } catch (error) {
      console.error('Error waking up vehicle:', error.response?.data || error.message);
      throw new Error('Failed to wake up vehicle');
    }
  }

  /**
   * Get drive state (speed, heading, GPS location, etc.)
   */
  async getDriveState(accessToken, vehicleId) {
    try {
      const client = this.createClient(accessToken);
      const response = await client.get(`/api/1/vehicles/${vehicleId}/data_request/drive_state`);
      return response.data.response;
    } catch (error) {
      console.error('Error fetching drive state:', error.response?.data || error.message);
      throw new Error('Failed to fetch drive state');
    }
  }

  /**
   * Get charge state (battery level, charging status, etc.)
   */
  async getChargeState(accessToken, vehicleId) {
    try {
      const client = this.createClient(accessToken);
      const response = await client.get(`/api/1/vehicles/${vehicleId}/data_request/charge_state`);
      return response.data.response;
    } catch (error) {
      console.error('Error fetching charge state:', error.response?.data || error.message);
      throw new Error('Failed to fetch charge state');
    }
  }

  /**
   * Get climate state (temperature, HVAC status, etc.)
   */
  async getClimateState(accessToken, vehicleId) {
    try {
      const client = this.createClient(accessToken);
      const response = await client.get(`/api/1/vehicles/${vehicleId}/data_request/climate_state`);
      return response.data.response;
    } catch (error) {
      console.error('Error fetching climate state:', error.response?.data || error.message);
      throw new Error('Failed to fetch climate state');
    }
  }

  /**
   * Get vehicle state (odometer, software version, etc.)
   */
  async getVehicleState(accessToken, vehicleId) {
    try {
      const client = this.createClient(accessToken);
      const response = await client.get(`/api/1/vehicles/${vehicleId}/data_request/vehicle_state`);
      return response.data.response;
    } catch (error) {
      console.error('Error fetching vehicle state:', error.response?.data || error.message);
      throw new Error('Failed to fetch vehicle state');
    }
  }

  /**
   * Check if vehicle is awake
   */
  isVehicleAwake(vehicle) {
    return vehicle.state === 'online';
  }

  /**
   * Parse vehicle data for metrics
   */
  parseVehicleDataForMetrics(vehicleData) {
    const driveState = vehicleData.drive_state || {};
    const chargeState = vehicleData.charge_state || {};
    const climateState = vehicleData.climate_state || {};
    const vehicleState = vehicleData.vehicle_state || {};

    return {
      // Speed and distance
      speed: driveState.speed || 0,
      speedUnit: driveState.speed ? 'mph' : null, // Tesla API returns mph
      odometer: vehicleState.odometer || 0,
      odometerUnit: 'miles',

      // Battery and energy
      batteryLevel: chargeState.battery_level || 0,
      batteryRange: chargeState.battery_range || 0,
      estBatteryRange: chargeState.est_battery_range || 0,
      idealBatteryRange: chargeState.ideal_battery_range || 0,
      usableBatteryLevel: chargeState.usable_battery_level || 0,

      // Power
      chargerPower: chargeState.charger_power || 0,
      chargeEnergyAdded: chargeState.charge_energy_added || 0,

      // Drive state
      shiftState: driveState.shift_state || 'P',
      heading: driveState.heading || 0,
      gpsAsOf: driveState.gps_as_of || null,

      // Location (optional)
      latitude: driveState.latitude || null,
      longitude: driveState.longitude || null,

      // Climate
      insideTemp: climateState.inside_temp || null,
      outsideTemp: climateState.outside_temp || null,
      isClimateOn: climateState.is_climate_on || false,

      // Timestamp
      timestamp: new Date(vehicleData.vehicle_state?.timestamp || Date.now()),
    };
  }
}

export default new TeslaApiService();
