const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const adminRouter = express.Router();

// Middleware to verify admin token
function verifyAdminToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, 'admin_secret_key', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.admin = decoded;
        next();
    });
}

// Test route
adminRouter.get('/test', (req, res) => {
    console.log('Admin test route accessed');
    res.send('Admin test route working');
});

// Admin login route
adminRouter.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Admin login request:', { username });

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    db.query('SELECT * FROM admins WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const admin = results[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: admin.id, username: admin.username }, 'admin_secret_key', { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    });
});

// Fetch all users
adminRouter.get('/users', verifyAdminToken, (req, res) => {
    const query = 'SELECT full_name, email, phone, license_number, vehicle_number, gender FROM users';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Fetch users error:', err);
            return res.status(500).json({ message: 'Server error: ' + err.message });
        }
        console.log('Users fetched for admin:', results.length);
        res.json(results);
    });
});

// Delete a user
adminRouter.delete('/users/:email', verifyAdminToken, (req, res) => {
    const email = req.params.email;

    // Start a transaction to delete user and related data
    db.beginTransaction(err => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        // Delete bookings associated with the user
        db.query('DELETE FROM bookings WHERE user_id = (SELECT id FROM users WHERE email = ?)', [email], (err) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Delete bookings error:', err);
                    res.status(500).json({ message: 'Server error' });
                });
            }

            // Delete rides posted by the user
            db.query('DELETE FROM rides WHERE user_id = (SELECT id FROM users WHERE email = ?)', [email], (err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Delete rides error:', err);
                        res.status(500).json({ message: 'Server error' });
                    });
                }

                // Delete the user
                db.query('DELETE FROM users WHERE email = ?', [email], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Delete user error:', err);
                            res.status(500).json({ message: 'Server error' });
                        });
                    }

                    if (result.affectedRows === 0) {
                        return db.rollback(() => {
                            res.status(404).json({ message: 'User not found' });
                        });
                    }

                    db.commit(err => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Commit error:', err);
                                res.status(500).json({ message: 'Server error' });
                            });
                        }
                        console.log('User deleted:', email);
                        res.json({ message: 'User deleted successfully' });
                    });
                });
            });
        });
    });
});

// Fetch upcoming rides (next 7 days)
adminRouter.get('/upcoming-rides', verifyAdminToken, (req, res) => {
    const { date, email } = req.query;
    let query = `
        SELECT r.id, r.starting_point, r.destination, r.date, r.time, r.available_seats, r.price,
               u.full_name AS driver_name
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') > NOW()
        AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') <= DATE_ADD(NOW(), INTERVAL 7 DAY)
    `;
    const params = [];

    if (date) {
        query += ' AND r.date = ?';
        params.push(date);
    }
    if (email) {
        query += ' AND u.email = ?';
        params.push(email);
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Fetch upcoming rides error:', err);
            return res.status(500).json({ message: 'Server error: ' + err.message });
        }
        const formattedResults = results.map(ride => ({
            id: ride.id,
            driver_name: ride.driver_name,
            starting_point: ride.starting_point,
            destination: ride.destination,
            date: ride.date.toLocaleDateString('en-CA'),
            time: ride.time.slice(0, 5),
            available_seats: ride.available_seats,
            price: ride.price
        }));
        console.log('Upcoming rides fetched for admin:', formattedResults.length);
        res.json(formattedResults);
    });
});

// Fetch previous rides (past rides)
adminRouter.get('/previous-rides', verifyAdminToken, (req, res) => {
    const { date, email } = req.query;
    let query = `
        SELECT r.id, r.starting_point, r.destination, r.date, r.time, r.available_seats, r.price,
               u.full_name AS driver_name
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') <= NOW()
    `;
    const params = [];

    if (date) {
        query += ' AND r.date = ?';
        params.push(date);
    }
    if (email) {
        query += ' AND u.email = ?';
        params.push(email);
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Fetch previous rides error:', err);
            return res.status(500).json({ message: 'Server error: ' + err.message });
        }
        const formattedResults = results.map(ride => ({
            id: ride.id,
            driver_name: ride.driver_name,
            starting_point: ride.starting_point,
            destination: ride.destination,
            date: ride.date.toLocaleDateString('en-CA'),
            time: ride.time.slice(0, 5),
            available_seats: ride.available_seats,
            price: ride.price
        }));
        console.log('Previous rides fetched for admin:', formattedResults.length);
        res.json(formattedResults);
    });
});

// Fetch riders for a specific ride
adminRouter.get('/rides/:rideId/riders', verifyAdminToken, (req, res) => {
    const rideId = req.params.rideId;
    const query = `
        SELECT u.full_name, u.email
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.ride_id = ?
    `;
    db.query(query, [rideId], (err, results) => {
        if (err) {
            console.error('Fetch riders error:', err);
            return res.status(500).json({ message: 'Server error: ' + err.message });
        }
        console.log('Riders fetched for ride:', rideId, results.length);
        res.json(results);
    });
});

module.exports = adminRouter;