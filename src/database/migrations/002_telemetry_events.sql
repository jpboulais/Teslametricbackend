-- Raw telemetry ingest events (e.g. from Fleet Telemetry relay or future HTTP push)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin VARCHAR(17),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(64) DEFAULT 'ingest',
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_vin ON telemetry_events(vin);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_received_at ON telemetry_events(received_at DESC);

COMMENT ON TABLE telemetry_events IS 'Raw telemetry payloads received at POST /telemetry/ingest';
