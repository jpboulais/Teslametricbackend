/**
 * Mock Tesla Service for Development/Testing
 * Returns realistic sample data when Tesla API is not accessible
 */

class MockTeslaService {
  constructor() {
    this.mockVehicle = {
      id: 123456789,
      vehicle_id: 987654321,
      vin: '5YJ3E1EA1KF123456',
      display_name: 'My Tesla',
      state: 'online',
      vehicle_config: {
        car_type: 'Model 3',
        exterior_color: 'MidnightSilverMetallic',
        trim_badging: 'Long Range',
        year: 2023,
      },
    };

    this.mockVehicleData = {
      drive_state: {
        speed: null, // null when parked, number when driving
        shift_state: 'P',
        heading: 0,
        latitude: 37.7749,
        longitude: -122.4194,
        gps_as_of: Date.now() / 1000,
      },
      charge_state: {
        battery_level: 74, // Your actual battery level!
        battery_range: 245.6,
        est_battery_range: 240.2,
        ideal_battery_range: 250.8,
        usable_battery_level: 73,
        charge_energy_added: 15.5,
        charger_power: 0,
        charging_state: 'Disconnected',
      },
      climate_state: {
        inside_temp: 20.5,
        outside_temp: 18.2,
        is_climate_on: false,
        driver_temp_setting: 21.0,
        passenger_temp_setting: 21.0,
      },
      vehicle_state: {
        odometer: 12456.8,
        software_version: '2024.14.9',
        car_version: '2024.14.9 abcdef123456',
        timestamp: Date.now(),
      },
      state: 'online',
    };
  }

  async getVehicles() {
    console.log('🎭 Using MOCK data - returning sample vehicle');
    return [this.mockVehicle];
  }

  async getVehicle() {
    console.log('🎭 Using MOCK data - returning sample vehicle');
    return this.mockVehicle;
  }

  async getVehicleData() {
    console.log('🎭 Using MOCK data - returning sample vehicle data with 74% battery');
    return this.mockVehicleData;
  }

  async wakeUpVehicle() {
    console.log('🎭 MOCK: Wake up command (simulated)');
    return { ...this.mockVehicle, state: 'online' };
  }

  async getDriveState() {
    return this.mockVehicleData.drive_state;
  }

  async getChargeState() {
    return this.mockVehicleData.charge_state;
  }

  async getClimateState() {
    return this.mockVehicleData.climate_state;
  }

  async getVehicleState() {
    return this.mockVehicleData.vehicle_state;
  }

  isVehicleAwake() {
    return true;
  }

  parseVehicleDataForMetrics(vehicleData) {
    // Same parsing logic as real service
    const driveState = vehicleData.drive_state || {};
    const chargeState = vehicleData.charge_state || {};
    const climateState = vehicleData.climate_state || {};
    const vehicleState = vehicleData.vehicle_state || {};

    return {
      speed: driveState.speed || 0,
      speedUnit: 'mph',
      odometer: vehicleState.odometer || 0,
      odometerUnit: 'miles',
      batteryLevel: chargeState.battery_level || 74,
      batteryRange: chargeState.battery_range || 245,
      estBatteryRange: chargeState.est_battery_range || 240,
      idealBatteryRange: chargeState.ideal_battery_range || 250,
      usableBatteryLevel: chargeState.usable_battery_level || 73,
      chargerPower: chargeState.charger_power || 0,
      chargeEnergyAdded: chargeState.charge_energy_added || 15.5,
      shiftState: driveState.shift_state || 'P',
      heading: driveState.heading || 0,
      gpsAsOf: driveState.gps_as_of || null,
      latitude: driveState.latitude || null,
      longitude: driveState.longitude || null,
      insideTemp: climateState.inside_temp || null,
      outsideTemp: climateState.outside_temp || null,
      isClimateOn: climateState.is_climate_on || false,
      timestamp: new Date(vehicleState.timestamp || Date.now()),
    };
  }
}

export default new MockTeslaService();
