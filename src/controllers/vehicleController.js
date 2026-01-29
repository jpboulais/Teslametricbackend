import teslaApiService from '../services/teslaApiService.js';
import mockTeslaService from '../services/mockTeslaService.js';
import teslaAuthService from '../services/teslaAuthService.js';
import Vehicle from '../models/Vehicle.js';
import TeslaToken from '../models/TeslaToken.js';
import { query } from '../database/db.js';
import config from '../config/config.js';

// Use mock service in development until Tesla registration is complete
const useMockData = process.env.USE_MOCK_TESLA === 'true' || config.nodeEnv === 'development';
const activeService = useMockData ? mockTeslaService : teslaApiService;

if (useMockData) {
  console.log('🎭 MOCK MODE: Using sample Tesla data (set USE_MOCK_TESLA=false to use real API)');
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(userId) {
  let tokens = await TeslaToken.findByUserId(userId);
  
  if (!tokens) {
    throw new Error('No tokens found for user');
  }

  // Check if token is expired and refresh if needed
  if (TeslaToken.isExpired(tokens)) {
    const newTokenData = await teslaAuthService.refreshAccessToken(tokens.refresh_token);
    tokens = await TeslaToken.upsert(userId, newTokenData);
  }

  return tokens.access_token;
}

/**
 * Get all vehicles for the authenticated user
 */
export const getVehicles = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get valid access token
    const accessToken = await getValidAccessToken(userId);

    // Fetch vehicles from Tesla API (or mock service)
    const teslaVehicles = await activeService.getVehicles(accessToken);

    // Sync vehicles with database
    const vehicles = [];
    for (const teslaVehicle of teslaVehicles) {
      const vehicle = await Vehicle.upsert({
        userId,
        teslaVehicleId: teslaVehicle.id,
        vin: teslaVehicle.vin,
        displayName: teslaVehicle.display_name,
        model: teslaVehicle.vehicle_config?.car_type || teslaVehicle.vehicle_config?.trim_badging,
        year: teslaVehicle.vehicle_config?.year,
        color: teslaVehicle.vehicle_config?.exterior_color,
        state: teslaVehicle.state,
        batteryCapacityKwh: null, // Not provided by API directly
        epaRangeKm: null, // Not provided by API directly
      });
      vehicles.push(vehicle);
    }

    res.json({
      success: true,
      vehicles,
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vehicles',
    });
  }
};

/**
 * Get specific vehicle data
 */
export const getVehicleData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vehicleId } = req.params;

    // Get vehicle from database
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(userId);

    // Check if vehicle is awake, wake if needed
    const vehicleInfo = await activeService.getVehicle(accessToken, vehicle.tesla_vehicle_id);
    
    if (!activeService.isVehicleAwake(vehicleInfo)) {
      // Attempt to wake up
      await activeService.wakeUpVehicle(accessToken, vehicle.tesla_vehicle_id);
      
      // Wait a bit for vehicle to wake up
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Fetch vehicle data
    const vehicleData = await activeService.getVehicleData(accessToken, vehicle.tesla_vehicle_id);

    // Update vehicle state
    await Vehicle.updateState(vehicleId, vehicleData.state);

    res.json({
      success: true,
      vehicle: vehicleData,
    });
  } catch (error) {
    console.error('Error fetching vehicle data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vehicle data',
    });
  }
};

/**
 * Get vehicle metrics (processed data for the app)
 */
export const getVehicleMetrics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vehicleId } = req.params;
    const { period = 'trip' } = req.query; // trip, charge, all-time

    // Get vehicle from database
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(userId);

    // Fetch current vehicle data
    const vehicleData = await activeService.getVehicleData(accessToken, vehicle.tesla_vehicle_id);
    
    // Debug logging
    console.log('📊 Tesla API Response:', JSON.stringify(vehicleData, null, 2));
    
    // Parse data for metrics
    const currentMetrics = activeService.parseVehicleDataForMetrics(vehicleData);
    
    console.log('📊 Parsed Metrics:', currentMetrics);

    // Convert mph to kmh for speed
    const speedKmh = currentMetrics.speed ? currentMetrics.speed * 1.60934 : 0;
    
    // Calculate efficiency metrics based on period
    const batteryLevel = currentMetrics.batteryLevel || 0;
    const chargeEnergyAdded = currentMetrics.chargeEnergyAdded || 0;
    const odometer = currentMetrics.odometer || 0;
    
    const metrics = {
      current: {
        speed: Math.round(speedKmh),
        speedUnit: 'kmh',
        batteryLevel: batteryLevel,
        shiftState: currentMetrics.shiftState || 'P',
        timestamp: currentMetrics.timestamp,
      },
      liveConsumption: {
        rate: calculateInstantConsumption(currentMetrics), // Wh/km
        efficiency: batteryLevel > 0 ? Math.min(100, batteryLevel * 1.2) : 70,
      },
      averageEfficiency: {
        efficiency: batteryLevel > 0 ? Math.round(batteryLevel * 1.1) : 81,
        distance: odometer > 0 ? Math.round(odometer * 1.60934) : 100,
      },
      energyUsage: {
        total: chargeEnergyAdded > 0 ? chargeEnergyAdded : (batteryLevel * 0.75 * 0.25),
        avgConsumption: 180,
      },
      period,
      debug: {
        rawBatteryLevel: currentMetrics.batteryLevel,
        rawSpeed: currentMetrics.speed,
        rawOdometer: currentMetrics.odometer,
        rawChargeEnergy: currentMetrics.chargeEnergyAdded,
      }
    };

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching vehicle metrics:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch vehicle metrics',
    });
  }
};

/**
 * Wake up a vehicle
 */
export const wakeUpVehicle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vehicleId } = req.params;

    // Get vehicle from database
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(userId);

    // Wake up vehicle
    const result = await activeService.wakeUpVehicle(accessToken, vehicle.tesla_vehicle_id);

    // Update vehicle state
    await Vehicle.updateState(vehicleId, result.state);

    res.json({
      success: true,
      state: result.state,
      message: 'Vehicle wake command sent',
    });
  } catch (error) {
    console.error('Error waking up vehicle:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to wake up vehicle',
    });
  }
};

/**
 * Helper: Calculate instantaneous consumption
 */
function calculateInstantConsumption(metrics) {
  // Placeholder calculation
  // In production: power (kW) / speed (km/h) * 1000 = Wh/km
  if (metrics.speed === 0) return 0;
  
  // Estimate based on typical Tesla consumption
  const baseConsumption = 150; // Wh/km baseline
  const speedFactor = Math.max(1, metrics.speed / 100);
  
  return Math.round(baseConsumption * speedFactor);
}
