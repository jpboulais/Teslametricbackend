CREATE TABLE IF NOT EXISTS oauth_sessions (
  state VARCHAR(64) PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_created_at ON oauth_sessions(created_at);
