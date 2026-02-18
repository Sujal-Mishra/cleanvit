const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'cleanvit_secret_key_2024_vitvellore';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Auth Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Generate group number from room
function generateGroupNo(block, roomNumber) {
    return `${block}-${roomNumber.substring(0, 2)}`;
}

// ==================== AUTH ROUTES ====================

// Student Signup - Step 1: Request OTP
app.post('/api/auth/student/signup', (req, res) => {
    const { email } = req.body;

    if (!email || !email.endsWith('@vitstudent.ac.in')) {
        return res.status(400).json({ error: 'Please use a valid VIT email address' });
    }

    db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
        if (user) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        db.run('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to generate OTP' });

                // In production, send via email
                console.log(`OTP for ${email}: ${otp}`);
                res.json({ message: 'OTP sent to your email', otp: otp }); // Dev only
            });
    });
});

// Student Signup - Step 2: Verify OTP and create account
app.post('/api/auth/student/verify-otp', (req, res) => {
    const { email, otp, password, name, block, roomNumber } = req.body;

    db.get('SELECT * FROM otps WHERE email = ? AND otp = ? AND used = 0 AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1',
        [email, otp], (err, otpRecord) => {
            if (!otpRecord) {
                return res.status(400).json({ error: 'Invalid or expired OTP' });
            }

            const hashedPassword = bcrypt.hashSync(password, 10);
            const groupNo = generateGroupNo(block, roomNumber);

            db.run('INSERT INTO users (email, password, name, block, room_number, group_no) VALUES (?, ?, ?, ?, ?, ?)',
                [email, hashedPassword, name, block, roomNumber, groupNo], (err) => {
                    if (err) return res.status(500).json({ error: 'Failed to create account' });

                    db.run('UPDATE otps SET used = 1 WHERE id = ?', [otpRecord.id]);
                    res.json({ message: 'Account created successfully' });
                });
        });
});

// Student Login
app.post('/api/auth/student/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: 'student', block: user.block, roomNumber: user.room_number },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                block: user.block,
                roomNumber: user.room_number,
                groupNo: user.group_no
            }
        });
    });
});

// Cleaner Login
app.post('/api/auth/cleaner/login', (req, res) => {
    const { employeeId, password } = req.body;

    db.get('SELECT * FROM cleaners WHERE employee_id = ? AND is_active = 1', [employeeId], (err, cleaner) => {
        if (!cleaner || !bcrypt.compareSync(password, cleaner.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: cleaner.id, employeeId: cleaner.employee_id, role: 'cleaner', name: cleaner.name, blocks: JSON.parse(cleaner.assigned_blocks || '[]') },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            cleaner: {
                id: cleaner.id,
                employeeId: cleaner.employee_id,
                name: cleaner.name,
                assignedBlocks: JSON.parse(cleaner.assigned_blocks || '[]')
            }
        });
    });
});

// Admin Login
app.post('/api/auth/admin/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
        if (!admin || !bcrypt.compareSync(password, admin.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, admin: { id: admin.id, username: admin.username } });
    });
});

// ==================== REQUEST ROUTES ====================

// Create new cleaning request
app.post('/api/requests', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { type, instructions } = req.body;
    const requestId = `REQ-${uuidv4().substring(0, 8).toUpperCase()}`;

    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate QR code
        const qrData = JSON.stringify({
            requestId,
            block: user.block,
            room: user.room_number,
            type
        });

        QRCode.toDataURL(qrData, (err, qrCode) => {
            if (err) return res.status(500).json({ error: 'Failed to generate QR code' });

            db.run(`
                INSERT INTO requests (request_id, user_id, block, room_number, group_no, type, instructions, qr_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [requestId, req.user.id, user.block, user.room_number, user.group_no, type, instructions, qrCode],
                function (err) {
                    if (err) return res.status(500).json({ error: 'Failed to create request' });

                    res.json({
                        message: 'Request created successfully',
                        request: {
                            id: this.lastID,
                            requestId,
                            type,
                            instructions,
                            status: 'pending',
                            qrCode,
                            block: user.block,
                            roomNumber: user.room_number
                        }
                    });
                });
        });
    });
});

// Get student's request history
app.get('/api/requests', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { status, limit = 50 } = req.query;

    let query = 'SELECT * FROM requests WHERE user_id = ?';
    const params = [req.user.id];

    if (status && status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, requests) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch requests' });
        res.json(requests);
    });
});

// Get pending requests for cleaner (assigned blocks only)
app.get('/api/requests/pending', authenticateToken, (req, res) => {
    if (req.user.role !== 'cleaner') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const blocks = req.user.blocks;

    db.all(`
        SELECT r.*, u.name as student_name, u.email as student_email
        FROM requests r
        JOIN users u ON r.user_id = u.id
        WHERE r.status = 'pending' AND r.block IN (${blocks.map(() => '?').join(',')})
        ORDER BY r.created_at ASC
    `, blocks, (err, requests) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch requests' });
        res.json(requests);
    });
});

// Get active requests for cleaner
app.get('/api/requests/active', authenticateToken, (req, res) => {
    if (req.user.role !== 'cleaner') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    db.all(`
        SELECT r.*, u.name as student_name, u.email as student_email
        FROM requests r
        JOIN users u ON r.user_id = u.id
        WHERE r.cleaner_id = ? AND r.status IN ('accepted', 'in_progress')
        ORDER BY r.accepted_at ASC
    `, [req.user.id], (err, requests) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch requests' });

        // Check and update requests older than 3 hours
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const updatedRequests = requests.map(req => {
            if (req.status === 'in_progress' && new Date(req.accepted_at) < threeHoursAgo) {
                // Auto-update to pending
                db.run('UPDATE requests SET status = "pending", cleaner_id = NULL, accepted_at = NULL WHERE id = ?', [req.id]);
                return { ...req, status: 'pending' };
            }
            return req;
        });

        res.json(updatedRequests.filter(r => r.status !== 'pending'));
    });
});

// Accept a request
app.put('/api/requests/:id/accept', authenticateToken, (req, res) => {
    if (req.user.role !== 'cleaner') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const requestId = req.params.id;
    const acceptedAt = new Date().toISOString();

    db.run(`
        UPDATE requests 
        SET status = 'in_progress', cleaner_id = ?, accepted_at = ?
        WHERE id = ? AND status = 'pending'
    `, [req.user.id, acceptedAt, requestId], function (err) {
        if (err || this.changes === 0) {
            return res.status(400).json({ error: 'Failed to accept request or already accepted' });
        }
        res.json({ message: 'Request accepted successfully' });
    });
});

// Complete request via QR scan
app.put('/api/requests/:id/complete', authenticateToken, (req, res) => {
    const { qrData } = req.body;
    const requestId = req.params.id;

    if (req.user.role !== 'cleaner') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    db.get('SELECT * FROM requests WHERE id = ?', [requestId], (err, request) => {
        if (!request) return res.status(404).json({ error: 'Request not found' });

        // Verify QR data matches
        try {
            const parsed = JSON.parse(qrData);
            if (parsed.requestId !== request.request_id) {
                return res.status(400).json({ error: 'Invalid QR code' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Invalid QR code format' });
        }

        const completedAt = new Date().toISOString();

        db.run(`
            UPDATE requests 
            SET status = 'completed', completed_at = ?
            WHERE id = ?
        `, [completedAt, requestId], function (err) {
            if (err) return res.status(500).json({ error: 'Failed to complete request' });
            res.json({ message: 'Request completed successfully' });
        });
    });
});

// Rate a completed request
app.put('/api/requests/:id/rate', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { rating, feedback } = req.body;
    const requestId = req.params.id;

    db.run(`
        UPDATE requests 
        SET rating = ?, feedback = ?
        WHERE id = ? AND user_id = ? AND status = 'completed'
    `, [rating, feedback, requestId, req.user.id], function (err) {
        if (err || this.changes === 0) {
            return res.status(400).json({ error: 'Failed to rate request' });
        }
        res.json({ message: 'Rating submitted successfully' });
    });
});

// ==================== ADMIN ROUTES ====================

// Get all statistics
app.get('/api/admin/stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const stats = {};

    // Total requests
    db.get('SELECT COUNT(*) as count FROM requests', [], (err, row) => {
        stats.totalRequests = row.count;

        // Today's requests
        db.get('SELECT COUNT(*) as count FROM requests WHERE date(created_at) = date("now")', [], (err, row) => {
            stats.todayRequests = row.count;

            // Requests by status
            db.all('SELECT status, COUNT(*) as count FROM requests GROUP BY status', [], (err, rows) => {
                stats.requestsByStatus = rows;

                // Average completion time
                db.get(`
                    SELECT AVG((julianday(completed_at) - julianday(accepted_at)) * 24) as avg_hours 
                    FROM requests 
                    WHERE status = 'completed' AND completed_at IS NOT NULL
                `, [], (err, row) => {
                    stats.avgCompletionHours = row.avg_hours ? parseFloat(row.avg_hours).toFixed(2) : 0;

                    // Requests by block
                    db.all('SELECT block, COUNT(*) as count FROM requests GROUP BY block ORDER BY count DESC', [], (err, rows) => {
                        stats.requestsByBlock = rows;

                        // Average rating
                        db.get('SELECT AVG(rating) as avg_rating FROM requests WHERE rating IS NOT NULL', [], (err, row) => {
                            stats.avgRating = row.avg_rating ? parseFloat(row.avg_rating).toFixed(2) : 0;

                            // Active cleaners
                            db.get('SELECT COUNT(*) as count FROM cleaners WHERE is_active = 1', [], (err, row) => {
                                stats.activeCleaners = row.count;

                                // Total students
                                db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
                                    stats.totalStudents = row.count;

                                    res.json(stats);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Get all cleaners
app.get('/api/admin/cleaners', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    db.all('SELECT id, employee_id, name, assigned_blocks, is_active, created_at FROM cleaners', [], (err, cleaners) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch cleaners' });

        const result = cleaners.map(c => ({
            ...c,
            assigned_blocks: JSON.parse(c.assigned_blocks || '[]')
        }));

        res.json(result);
    });
});

// Add new cleaner
app.post('/api/admin/cleaners', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { employeeId, name, password, assignedBlocks } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(`
        INSERT INTO cleaners (employee_id, password, name, assigned_blocks)
        VALUES (?, ?, ?, ?)
    `, [employeeId, hashedPassword, name, JSON.stringify(assignedBlocks)], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to create cleaner' });
        res.json({ message: 'Cleaner created successfully', id: this.lastID });
    });
});

// Update cleaner
app.put('/api/admin/cleaners/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, assignedBlocks, isActive } = req.body;
    const cleanerId = req.params.id;

    db.run(`
        UPDATE cleaners 
        SET name = ?, assigned_blocks = ?, is_active = ?
        WHERE id = ?
    `, [name, JSON.stringify(assignedBlocks), isActive ? 1 : 0, cleanerId], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update cleaner' });
        res.json({ message: 'Cleaner updated successfully' });
    });
});

// Delete cleaner
app.delete('/api/admin/cleaners/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    db.run('DELETE FROM cleaners WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to delete cleaner' });
        res.json({ message: 'Cleaner deleted successfully' });
    });
});

// Get all requests (admin view)
app.get('/api/admin/requests', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { status, block, limit = 100 } = req.query;

    let query = 'SELECT r.*, u.name as student_name, u.email as student_email, c.name as cleaner_name FROM requests r JOIN users u ON r.user_id = u.id LEFT JOIN cleaners c ON r.cleaner_id = c.id WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
        query += ' AND r.status = ?';
        params.push(status);
    }

    if (block) {
        query += ' AND r.block = ?';
        params.push(block);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    db.all(query, params, (err, requests) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch requests' });
        res.json(requests);
    });
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/student', (req, res) => {
    res.sendFile(__dirname + '/public/student.html');
});

app.get('/cleaner', (req, res) => {
    res.sendFile(__dirname + '/public/cleaner.html');
});

app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`Clean VIT server running on http://localhost:${PORT}`);
});
