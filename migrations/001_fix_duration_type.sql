-- Migration: Fix duration column type from integer to float
-- Date: 2025-12-22
-- Description:
--   1. Change duration column type from integer to float to support decimal seconds
--   2. This fixes the error: "invalid input syntax for type integer: 2061.090087890625"

-- Change duration column type
ALTER TABLE transcripts
ALTER COLUMN duration TYPE DOUBLE PRECISION;

-- Add comment to document the change
COMMENT ON COLUMN transcripts.duration IS '오디오 길이 (초 단위, 소수점 포함)';
