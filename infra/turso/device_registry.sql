-- Turso Device Registry Schema
-- SOVEREIGN DATA PLANE INTEGRATION - Phase 2
-- NO Cloudflare, enterprise-grade, atomic, idempotent

CREATE TABLE IF NOT EXISTS device_registry (
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_info TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trusted', 'pending', 'blocked')),
  last_seen TEXT NOT NULL,
  PRIMARY KEY (user_id, device_id)
);

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_device_registry_user_id 
  ON device_registry(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_device_registry_status 
  ON device_registry(status);
