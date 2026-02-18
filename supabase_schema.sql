-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    block TEXT NOT NULL,
    room_number TEXT NOT NULL,
    group_no TEXT,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLEANERS
CREATE TABLE IF NOT EXISTS cleaners (
    id SERIAL PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    assigned_blocks TEXT, -- Store as JSON array string "['A', 'B']"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REQUESTS (With relations for joins if needed)
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    request_id TEXT UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    cleaner_id INTEGER REFERENCES cleaners(id),
    block TEXT NOT NULL,
    room_number TEXT NOT NULL,
    group_no TEXT,
    type TEXT NOT NULL,
    instructions TEXT,
    status TEXT DEFAULT 'pending',
    qr_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rating INTEGER,
    feedback TEXT
);

-- 4. OTPS
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ADMINS
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEFAULT ADMIN (Password: admin123)
-- You may need to replace the hash if using a different hashing algorithm locally
INSERT INTO admins (username, password) VALUES ('admin', '$2b$12$K1/1.T4.U4g11e.b1.g2.e1V1a1a1a1a1a1a1a1a1a1a1a1a1') ON CONFLICT DO NOTHING;

-- DEFAULT CLEANERS (Password: cleaner123 / ramu123)
-- Adjust hashes as needed
INSERT INTO cleaners (employee_id, password, name, assigned_blocks) VALUES
('CLN001', '$2b$12$...', 'John Smith', '["A","B","C","Q","M"]'),
('RAMU', '$2b$12$...', 'Ramu', '["P","Q","R","S"]')
ON CONFLICT DO NOTHING;
