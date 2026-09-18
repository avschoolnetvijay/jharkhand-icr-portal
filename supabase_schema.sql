-- ========================================================
-- JHARKHAND ICT 108 & SC 664 PORTAL - SUPABASE DATABASE SCHEMA
-- Run this entire script in Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Table: school_status (Status of each school)
CREATE TABLE IF NOT EXISTS public.school_status (
    udise TEXT PRIMARY KEY,
    snil TEXT,
    school_name TEXT NOT NULL,
    district TEXT NOT NULL,
    block TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'Completed',
    total_devices INTEGER DEFAULT 0,
    installed_by TEXT NOT NULL,
    mobile TEXT,
    installation_date TEXT,
    submission_timestamp TEXT,
    devices_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: device_inventory (Row-wise device serial inventory)
CREATE TABLE IF NOT EXISTS public.device_inventory (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submission_id TEXT,
    udise TEXT NOT NULL REFERENCES public.school_status(udise) ON DELETE CASCADE,
    snil TEXT,
    school_name TEXT NOT NULL,
    district TEXT,
    block TEXT,
    category TEXT,
    item_name TEXT NOT NULL,
    make_model TEXT,
    serial_number TEXT NOT NULL,
    installed_status TEXT DEFAULT 'Yes',
    working_status TEXT DEFAULT 'Yes',
    installation_date TEXT,
    installed_by TEXT,
    mobile TEXT,
    submission_timestamp TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on uppercase serial number to guarantee ZERO duplicates at database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_inventory_serial_unique 
ON public.device_inventory (UPPER(TRIM(serial_number)));

-- Index for fast lookup by UDISE
CREATE INDEX IF NOT EXISTS idx_device_inventory_udise 
ON public.device_inventory (udise);

-- 3. Table: master_schools (Master list of all schools)
CREATE TABLE IF NOT EXISTS public.master_schools (
    udise TEXT PRIMARY KEY,
    snil TEXT,
    school_name TEXT NOT NULL,
    district TEXT NOT NULL,
    block TEXT NOT NULL,
    raw_type TEXT,
    including_smart TEXT,
    category TEXT,
    device_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC ACCESS POLICIES
-- ========================================================

ALTER TABLE public.school_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_schools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public access school_status" ON public.school_status;
DROP POLICY IF EXISTS "Public access device_inventory" ON public.device_inventory;
DROP POLICY IF EXISTS "Public access master_schools" ON public.master_schools;

-- Allow full read/write access via Publishable/Anon key
CREATE POLICY "Public access school_status" 
ON public.school_status FOR ALL 
TO anon, authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Public access device_inventory" 
ON public.device_inventory FOR ALL 
TO anon, authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Public access master_schools" 
ON public.master_schools FOR ALL 
TO anon, authenticated 
USING (true) WITH CHECK (true);
