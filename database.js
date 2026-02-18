const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./cleanvit.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Users table (students)
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                block TEXT NOT NULL,
                room_number TEXT NOT NULL,
                group_no TEXT,
                role TEXT DEFAULT 'student',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Cleaners table
        db.run(`
            CREATE TABLE IF NOT EXISTS cleaners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                assigned_blocks TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admin table
        db.run(`
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Requests table
        db.run(`
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                cleaner_id INTEGER,
                block TEXT NOT NULL,
                room_number TEXT NOT NULL,
                group_no TEXT,
                type TEXT NOT NULL,
                instructions TEXT,
                status TEXT DEFAULT 'pending',
                priority INTEGER DEFAULT 0,
                qr_code TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                accepted_at DATETIME,
                completed_at DATETIME,
                rating INTEGER,
                feedback TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (cleaner_id) REFERENCES cleaners(id)
            )
        `);

        // OTP table
        db.run(`
            CREATE TABLE IF NOT EXISTS otps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                used INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes
        db.run(`CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_requests_block ON requests(block)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_requests_user ON requests(user_id)`);

        // Insert default admin
        const adminPassword = bcrypt.hashSync('admin123', 10);
        db.run(`
            INSERT OR IGNORE INTO admins (username, password) 
            VALUES ('admin', ?)
        `, [adminPassword], (err) => {
            if (!err) {
                console.log('Default admin created');
            }
        });

        // Insert sample cleaners
        const cleaner1Pass = bcrypt.hashSync('cleaner123', 10);
        db.run(`
            INSERT OR IGNORE INTO cleaners (employee_id, password, name, assigned_blocks)
            VALUES ('CLN001', ?, 'John Smith', '["A1","A2","A3"]')
        `, [cleaner1Pass]);

        const cleaner2Pass = bcrypt.hashSync('cleaner123', 10);
        db.run(`
            INSERT OR IGNORE INTO cleaners (employee_id, password, name, assigned_blocks)
            VALUES ('CLN002', ?, 'Maria Garcia', '["B1","B2","B3"]')
        `, [cleaner2Pass]);

        const cleaner3Pass = bcrypt.hashSync('cleaner123', 10);
        db.run(`
            INSERT OR IGNORE INTO cleaners (employee_id, password, name, assigned_blocks)
            VALUES ('CLN003', ?, 'David Chen', '["C1","C2","C3"]')
        `, [cleaner3Pass]);

        console.log('Database initialized successfully');
    });
}

module.exports = db;
