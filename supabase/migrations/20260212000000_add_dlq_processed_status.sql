-- Add 'processed' to dlq_status enum
ALTER TYPE dlq_status ADD VALUE IF NOT EXISTS 'processed';

-- Add processed_at column to ingress_buffer
ALTER TABLE ingress_buffer
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Add comment for the new column
COMMENT ON COLUMN ingress_buffer.processed_at IS 'Timestamp when the entry was successfully processed';
