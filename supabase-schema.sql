-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_plan AS ENUM ('free', 'pro');
CREATE TYPE scan_status AS ENUM ('pending', 'completed', 'failed');

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    plan user_plan DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scans table
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    status scan_status DEFAULT 'pending',
    score INTEGER CHECK (score >= 0 AND score <= 100),
    result_json JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX idx_scans_url ON scans(url);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for scans table
-- Allow anyone to read scans by ID (for anonymous scans and sharing)
CREATE POLICY "Anyone can read scans by ID" ON scans
    FOR SELECT USING (true);

-- Allow authenticated users to read their own scans
CREATE POLICY "Users can read own scans" ON scans
    FOR SELECT USING (auth.uid() = user_id);

-- Allow anyone to insert scans (for anonymous scans)
CREATE POLICY "Anyone can insert scans" ON scans
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own scans
CREATE POLICY "Users can update own scans" ON scans
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role to bypass RLS for background processing
-- (This is handled by using the service role key in the API)

-- Create a function to automatically set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set completed_at
CREATE TRIGGER trigger_set_completed_at
    BEFORE UPDATE ON scans
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

-- Insert some sample data (optional - remove in production)
-- This helps with testing the migration
INSERT INTO users (id, email, plan) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'free'),
    ('00000000-0000-0000-0000-000000000002', 'pro@example.com', 'pro');
