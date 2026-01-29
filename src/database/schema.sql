-- Tesla Driving Metrics Database Schema

-- Drop existing tables (for development)
DROP TABLE IF EXISTS telemetry_data CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS tesla_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  tesla_user_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Tesla OAuth tokens table
CREATE TABLE tesla_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Vehicles table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tesla_vehicle_id BIGINT NOT NULL,
  vin VARCHAR(17) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  model VARCHAR(100),
  year INTEGER,
  color VARCHAR(50),
  state VARCHAR(50),
  battery_capacity_kwh DECIMAL(6, 2),
  epa_range_km DECIMAL(6, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, tesla_vehicle_id)
);

-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  start_odometer_km DECIMAL(10, 2),
  end_odometer_km DECIMAL(10, 2),
  distance_km DECIMAL(10, 2),
  start_battery_level INTEGER,
  end_battery_level INTEGER,
  energy_used_kwh DECIMAL(8, 3),
  avg_consumption_wh_per_km DECIMAL(8, 2),
  avg_efficiency_percent DECIMAL(5, 2),
  max_speed_kmh DECIMAL(6, 2),
  avg_speed_kmh DECIMAL(6, 2),
  trip_type VARCHAR(50) DEFAULT 'drive',
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Telemetry data table (time-series data)
CREATE TABLE telemetry_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Speed and distance
  speed_kmh DECIMAL(6, 2),
  odometer_km DECIMAL(10, 2),
  
  -- Battery and energy
  battery_level INTEGER,
  battery_range_km DECIMAL(6, 2),
  est_battery_range_km DECIMAL(6, 2),
  ideal_battery_range_km DECIMAL(6, 2),
  charge_energy_added_kwh DECIMAL(8, 3),
  
  -- Power and efficiency
  power_kw DECIMAL(8, 3),
  instantaneous_consumption_wh_per_km DECIMAL(8, 2),
  
  -- Drive state
  shift_state VARCHAR(10),
  heading INTEGER,
  
  -- Location (optional, for future features)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Climate
  inside_temp_c DECIMAL(4, 2),
  outside_temp_c DECIMAL(4, 2),
  is_climate_on BOOLEAN,
  
  -- Raw data (for debugging)
  raw_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tesla_user_id ON users(tesla_user_id);

CREATE INDEX idx_tesla_tokens_user_id ON tesla_tokens(user_id);
CREATE INDEX idx_tesla_tokens_expires_at ON tesla_tokens(expires_at);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_tesla_vehicle_id ON vehicles(tesla_vehicle_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);

CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_start_time ON trips(start_time);
CREATE INDEX idx_trips_is_complete ON trips(is_complete);

CREATE INDEX idx_telemetry_vehicle_id ON telemetry_data(vehicle_id);
CREATE INDEX idx_telemetry_trip_id ON telemetry_data(trip_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_data(timestamp);
CREATE INDEX idx_telemetry_vehicle_timestamp ON telemetry_data(vehicle_id, timestamp);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tesla_tokens_updated_at BEFORE UPDATE ON tesla_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts registered in the application';
COMMENT ON TABLE tesla_tokens IS 'OAuth tokens for Tesla API access';
COMMENT ON TABLE vehicles IS 'Tesla vehicles associated with user accounts';
COMMENT ON TABLE trips IS 'Driving trips with aggregated metrics';
COMMENT ON TABLE telemetry_data IS 'Time-series telemetry data from vehicles';
