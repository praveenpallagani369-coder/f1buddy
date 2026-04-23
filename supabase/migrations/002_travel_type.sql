-- Migration 002: Add travel_type to travel_records
-- Separates employer-required travel from personal travel (per spec)
ALTER TABLE travel_records ADD COLUMN IF NOT EXISTS travel_type text NOT NULL DEFAULT 'personal'
  CHECK (travel_type IN ('employer_required', 'personal'));
