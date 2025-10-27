-- Add extension tracking fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS extension_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extension_last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS extension_version TEXT;

-- Add index for finding active extension users
CREATE INDEX IF NOT EXISTS idx_users_extension_last_seen ON users(extension_last_seen) WHERE extension_connected = TRUE;
