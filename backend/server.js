const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const adminRouter = require('./admin.js');

const app = express();
const port = 3000;

console.log('adminRouter loaded:', adminRouter);


app.use(express.json());
app.use(cors());
const staticPath = path.join(__dirname, '../frontend');
console.log('Serving static files from:', staticPath);
app.use(express.static(staticPath));
app.use('/admin', adminRouter);


process.env.TZ = 'Asia/Kolkata';
console.log('Node.js timezone set to:', process.env.TZ);

app.use(bodyParser.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'Server is running' });
});

const validateMobileNumber = (phone) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(phone);
};

const validateVehicleNumber = (vehicleNumber) => {
    const vehicleRegex = /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/;
    return vehicleRegex.test(vehicleNumber);
};

const validateLicenseNumber = (licenseNumber) => {
    const licenseRegex = /^[A-Z]{2}-\d{2,3}\/\d{4}\/\d{7}$/;
    return licenseRegex.test(licenseNumber);
};

//login
app.post('/register', (req, res) => {
    const { fullName, email, password, phone } = req.body;
    console.log('Register request received:', { fullName, email, password, phone });

    if (!fullName || !email || !password || !phone) {
        console.error('Missing required fields:', { fullName, email, password, phone });
        return res.status(400).json({ message: 'Full name, email, password, and mobile number are required' });
    }

    // Validate mobile number
    if (!validateMobileNumber(phone)) {
        console.error('Invalid mobile number:', phone);
        return res.status(400).json({ message: 'Mobile number must be a 10-digit number starting with 6, 7, 8, or 9' });
    }

    const query = 'INSERT INTO users (full_name, email, password, phone) VALUES (?, ?, ?, ?)';
    db.query(query, [fullName, email, password, phone], (err, result) => {
        if (err) {
            console.error('Register error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Email already registered' });
            }
            return res.status(500).json({ message: 'Error registering user: ' + err.message });
        }
        console.log('User registered in database:', { email, insertId: result.insertId });
        res.status(201).json({ message: 'Registration successful! You can now log in.', email });
    });
});

// Login endpoint (unchanged)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login request received:', { email, password });

    if (!email || !password) {
        console.error('Missing required fields:', { email, password });
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(query, [email, password], (err, results) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ message: 'Error logging in: ' + err.message });
        }
        if (results.length === 0) {
            console.log('Login failed: Invalid credentials for', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        console.log('Login successful:', { email });
        res.json({ message: `Welcome back, ${results[0].full_name}!`, name: results[0].full_name });
    });
});

// Fetch profile (unchanged)
app.get('/profile', (req, res) => {
    const email = req.query.email;
    console.log('Profile fetch request received:', { email });

    if (!email) {
        console.error('Email not provided in query');
        return res.status(400).json({ message: 'Email is required' });
    }

    const query = 'SELECT full_name, email, phone, license_number, vehicle_number, gender FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Profile fetch error:', err);
            return res.status(500).json({ message: 'Error fetching profile: ' + err.message });
        }
        if (results.length === 0) {
            console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('Profile fetched:', results[0]);
        res.json(results[0]);
    });
});

// Update profile (unchanged)
app.post('/profile/update', (req, res) => {
    const { fullName, email, phone, licenseNumber, vehicleNumber, gender } = req.body;
    console.log('Profile update request received:', req.body);

    if (!email) {
        console.error('Email not provided in update request');
        return res.status(400).json({ message: 'Email is required' });
    }

    // Validate mobile number
    if (phone && !validateMobileNumber(phone)) {
        console.error('Invalid mobile number:', phone);
        return res.status(400).json({ message: 'Mobile number must be a 10-digit number starting with 6, 7, 8, or 9' });
    }

    // Validate vehicle number
    if (vehicleNumber && !validateVehicleNumber(vehicleNumber)) {
        console.error('Invalid vehicle number:', vehicleNumber);
        return res.status(400).json({ message: 'Vehicle number must follow the format: SS DD CC NNNN (e.g., DL 01 AB 1234)' });
    }

    // Validate license number
    if (licenseNumber && !validateLicenseNumber(licenseNumber)) {
        console.error('Invalid license number:', licenseNumber);
        return res.status(400).json({ message: 'License number must follow the format: SS-RTO/YYYY/NNNNNNN (e.g., DL-0420110149646)' });
    }

    const query = 'UPDATE users SET full_name = ?, phone = ?, license_number = ?, vehicle_number = ?, gender = ? WHERE email = ?';
    db.query(query, [fullName, phone, licenseNumber, vehicleNumber, gender, email], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Error updating profile: ' + err.message });
        }
        if (result.affectedRows === 0) {
            console.log('No user found for update:', email);
            return res.status(404).json({ message: 'No user found with this email' });
        }
        console.log('Profile updated successfully:', { email });
        res.json({ message: 'Profile updated successfully' });
    });
});

// Publish a ride endpoint (unchanged)
app.post('/publish-ride', (req, res) => {
    const { email, startingPoint, destination, date, time, availableSeats, price, ac, pets_allowed } = req.body;
    console.log('Publish ride request received:', req.body);

    if (!email || !startingPoint || !destination || !date || !time || !availableSeats || price === undefined || !ac || !pets_allowed) {
        console.error('Missing required fields:', { email, startingPoint, destination, date, time, availableSeats, price, ac, pets_allowed });
        return res.status(400).json({ message: 'All fields (email, starting point, destination, date, time, available seats, price, AC, pets allowed) are required' });
    }

    if (availableSeats > 2) {
        console.error('Available seats exceed maximum limit:', availableSeats);
        return res.status(400).json({ message: 'Maximum available seats is 2' });
    }

    const rideDateTimeStr = `${date} ${time}`;
    const rideDateTime = new Date(rideDateTimeStr);
    const now = new Date();
    if (rideDateTime <= now) {
        console.error('Ride date and time are in the past:', { rideDateTime, now });
        return res.status(400).json({ message: 'Cannot publish a ride with a past date and time' });
    }

    db.query('SELECT id, phone, gender, license_number, vehicle_number FROM users WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            console.error('User check error:', err);
            return res.status(500).json({ message: 'Error checking user: ' + err.message });
        }
        if (userResults.length === 0) {
            console.log('User not found for publishing ride:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResults[0];
        if (!user.phone) return res.status(403).json({ message: 'Mobile number is required to publish a ride' });
        if (!user.gender || user.gender.trim() === '') return res.status(403).json({ message: 'You must provide your gender in your profile to publish a ride' });
        if (!user.license_number || !user.vehicle_number) return res.status(403).json({ message: 'You must provide a valid license number and vehicle number in your profile to publish a ride' });

        const userId = user.id;
        const query = 'INSERT INTO rides (user_id, starting_point, destination, date, time, available_seats, price, ac, pets_allowed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [userId, startingPoint, destination, date, time, availableSeats, price, ac, pets_allowed], (err, result) => {
            if (err) {
                console.error('Ride publish error:', err);
                return res.status(500).json({ message: 'Error publishing ride: ' + err.message });
            }
            console.log('Ride published successfully:', { email, rideId: result.insertId, date });
            res.status(201).json({ message: 'Ride published successfully', rideId: result.insertId });
        });
    });
});

// Fetch user's published rides (unchanged)
app.get('/rides', (req, res) => {
    const email = req.query.email;
    console.log('Fetch rides request received:', { email });

    if (!email) {
        console.error('Email not provided in query');
        return res.status(400).json({ message: 'Email is required' });
    }

    const query = `
        SELECT r.id, r.starting_point, r.destination, r.date, r.time, r.available_seats, r.price, r.ac, r.pets_allowed, u.phone, u.gender,
               (SELECT COUNT(*) 
                FROM bookings b 
                WHERE b.ride_id = r.id AND b.status = 'pending') AS pending_requests
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE u.email = ?
        AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') > NOW()`;
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Rides fetch error:', err);
            return res.status(500).json({ message: 'Error fetching rides: ' + err.message });
        }
        const formattedResults = results.map(r => ({
            ...r,
            date: r.date ? r.date.toLocaleDateString('en-CA') : null,
            time: r.time ? r.time.slice(0, 5) : null
        }));
        console.log('Rides fetched (formatted):', formattedResults);
        res.json(formattedResults);
    });
});

// Fetch ride details with booking info (unchanged)
app.get('/rides/:id/bookings', (req, res) => {
    const rideId = req.params.id;
    const { email } = req.query;
    console.log('Fetch ride bookings request received:', { rideId, email });

    if (!email) {
        console.error('Email not provided');
        return res.status(400).json({ message: 'Email is required' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            console.error('User check error:', err);
            return res.status(500).json({ message: 'Error checking user: ' + err.message });
        }
        if (userResults.length === 0) {
            console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = userResults[0].id;
        const query = `
            SELECT r.id, r.starting_point, r.destination, r.date, r.time, r.available_seats, r.price, r.ac, r.pets_allowed,
                   b.id AS booking_id, b.seats_requested, b.status, u.full_name AS rider_name, u.email AS rider_email, u.phone AS rider_phone, u.gender AS rider_gender
            FROM rides r
            LEFT JOIN bookings b ON r.id = b.ride_id
            LEFT JOIN users u ON b.user_id = u.id
            WHERE r.id = ? AND r.user_id = ?
            AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') > NOW()`;
        db.query(query, [rideId, userId], (err, results) => {
            if (err) {
                console.error('Ride bookings fetch error:', err);
                return res.status(500).json({ message: 'Error fetching ride bookings: ' + err.message });
            }
            if (results.length === 0) {
                console.log('Ride not found, expired, or not owned by user:', { rideId, email });
                return res.status(404).json({ message: 'Ride not found, expired, or you do not have permission to view it' });
            }
            const ride = {
                id: results[0].id,
                starting_point: results[0].starting_point,
                destination: results[0].destination,
                date: results[0].date ? results[0].date.toLocaleDateString('en-CA') : null,
                time: results[0].time ? results[0].time.slice(0, 5) : null,
                available_seats: results[0].available_seats,
                price: results[0].price,
                ac: results[0].ac,
                pets_allowed: results[0].pets_allowed,
                bookings: results
                    .filter(row => row.booking_id)
                    .map(row => ({
                        booking_id: row.booking_id,
                        seats_requested: row.seats_requested,
                        status: row.status,
                        rider_name: row.rider_name,
                        rider_gender: row.rider_gender,
                        rider_phone: row.rider_phone
                    }))
            };
            console.log('Ride bookings fetched:', ride);
            res.json(ride);
        });
    });
});

// Accept a booking (unchanged)
app.put('/bookings/:id/accept', (req, res) => {
    const bookingId = req.params.id;
    const { email } = req.body;
    console.log('Accept booking request received:', { bookingId, email });

    if (!email) {
        console.error('Email not provided');
        return res.status(400).json({ message: 'Email is required' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            console.error('User check error:', err);
            return res.status(500).json({ message: 'Error checking user: ' + err.message });
        }
        if (userResults.length === 0) {
            console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = userResults[0].id;
        const query = `
            UPDATE bookings b
            JOIN rides r ON b.ride_id = r.id
            SET b.status = 'accepted'
            WHERE b.id = ? AND r.user_id = ? AND b.status = 'pending'
            AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') > NOW()`;
        db.query(query, [bookingId, userId], (err, result) => {
            if (err) {
                console.error('Accept booking error:', err);
                return res.status(500).json({ message: 'Error accepting booking: ' + err.message });
            }
            if (result.affectedRows === 0) {
                console.log('Booking not found, not pending, expired, or not owned by user:', { bookingId, email });
                return res.status(404).json({ message: 'Booking not found, already processed, expired, or you do not have permission' });
            }
            console.log('Booking accepted successfully:', { bookingId, email });
            res.json({ message: 'Booking accepted successfully' });
        });
    });
});

// Reject a booking (unchanged)
app.put('/bookings/:id/reject', (req, res) => {
    const bookingId = req.params.id;
    const { email } = req.body;
    console.log('Reject booking request received:', { bookingId, email });

    if (!email) {
        console.error('Email not provided');
        return res.status(400).json({ message: 'Email is required' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            console.error('User check error:', err);
            return res.status(500).json({ message: 'Error checking user: ' + err.message });
        }
        if (userResults.length === 0) {
            console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = userResults[0].id;
        const query = `
            UPDATE bookings b
            JOIN rides r ON b.ride_id = r.id
            SET b.status = 'rejected'
            WHERE b.id = ? AND r.user_id = ? AND b.status = 'pending'
            AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') > NOW()`;
        db.query(query, [bookingId, userId], (err, result) => {
            if (err) {
                console.error('Reject booking error:', err);
                return res.status(500).json({ message: 'Error rejecting booking: ' + err.message });
            }
            if (result.affectedRows === 0) {
                console.log('Booking not found, not pending, expired, or not owned by user:', { bookingId, email });
                return res.status(404).json({ message: 'Booking not found, already processed, expired, or you do not have permission' });
            }
            console.log('Booking rejected successfully:', { bookingId, email });
            res.json({ message: 'Booking rejected successfully' });
        });
    });
});

// Fetch available rides (unchanged)
app.get('/available-rides', (req, res) => {
    const email = req.query.email;
    console.log('Fetch available rides request received:', { email });

    if (!email) {
        console.error('Email not provided in query');
        return res.status(400).json({ message: 'Email is required' });
    }

    const query = `
        SELECT r.id, r.starting_point, r.destination, r.date, r.time, r.available_seats, r.price, r.ac, r.pets_allowed, 
               u.full_name AS driver_name, u.phone, u.gender
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE u.email != ?
        AND r.available_seats > (
            SELECT COALESCE(SUM(b.seats_requested), 0) 
            FROM bookings b 
            WHERE b.ride_id = r.id AND b.status = 'accepted'
        ) 
        AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') > NOW()`;
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Available rides fetch error:', err);
            return res.status(500).json({ message: 'Error fetching available rides: ' + err.message });
        }
        const formattedResults = results.map(r => ({
            ...r,
            date: r.date ? r.date.toLocaleDateString('en-CA') : null,
            time: r.time ? r.time.slice(0, 5) : null
        }));
        console.log('Available rides fetched:', formattedResults);
        res.json(formattedResults);
    });
});

// Book a ride endpoint (unchanged)
app.post('/book-ride', (req, res) => {
    const { email, rideId, seatsRequested } = req.body;
    console.log('Book ride request received:', { email, rideId, seatsRequested });

    if (!email || !rideId || !seatsRequested || seatsRequested < 1) {
        console.error('Missing or invalid required fields:', { email, rideId, seatsRequested });
        return res.status(400).json({ message: 'Email, ride ID, and valid seats requested are required' });
    }

    db.query('SELECT id, phone FROM users WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            console.error('User check error:', err);
            return res.status(500).json({ message: 'Error checking user: ' + err.message });
        }
        if (userResults.length === 0) {
            console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResults[0];
        if (!user.phone) {
            console.log('User lacks phone number:', { email });
            return res.status(403).json({ message: 'Mobile number is required to book a ride' });
        }

        const userId = user.id;
        db.query(`
            SELECT available_seats 
            FROM rides 
            WHERE id = ? AND user_id != ? 
            AND available_seats > (
                SELECT COALESCE(SUM(b.seats_requested), 0) 
                FROM bookings b 
                WHERE b.ride_id = ? AND b.status = 'accepted'
            )
            AND STR_TO_DATE(CONCAT(date, ' ', time), '%Y-%m-%d %H:%i') > NOW()`, [rideId, userId, rideId], (err, rideResults) => {
            if (err) {
                console.error('Ride check error:', err);
                return res.status(500).json({ message: 'Error checking ride: ' + err.message });
            }
            if (rideResults.length === 0) {
                console.log('Ride not found, expired, or no seats available:', { rideId, email });
                return res.status(404).json({ message: 'Ride not found, expired, or no seats available' });
            }

            const availableSeats = rideResults[0].available_seats;
            db.query('SELECT COALESCE(SUM(seats_requested), 0) as booked FROM bookings WHERE ride_id = ? AND status = "accepted"', [rideId], (err, bookedResult) => {
                if (err) {
                    console.error('Booking sum error:', err);
                    return res.status(500).json({ message: 'Error checking bookings: ' + err.message });
                }
                const totalBooked = bookedResult[0].booked || 0;
                if (seatsRequested > (availableSeats - totalBooked)) {
                    console.log('Not enough seats available:', { rideId, email, seatsRequested, availableSeats, totalBooked });
                    return res.status(400).json({ message: 'Not enough seats available' });
                }

                const query = 'INSERT INTO bookings (user_id, ride_id, seats_requested, status) VALUES (?, ?, ?, "pending")';
                db.query(query, [userId, rideId, seatsRequested], (err, result) => {
                    if (err) {
                        console.error('Booking error:', err);
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).json({ message: 'You have already requested to book this ride' });
                        }
                        return res.status(500).json({ message: 'Error booking ride: ' + err.message });
                    }
                    console.log('Ride booking requested successfully:', { email, rideId, seatsRequested });
                    res.status(201).json({ message: 'Ride booking requested successfully, awaiting driver approval' });
                });
            });
        });
    });
});

// Fetch user's booked rides (unchanged)
app.get('/booked-rides', (req, res) => {
    const email = req.query.email;
    console.log('Fetch booked rides request received:', { email });

    if (!email) {
        console.error('Email not provided in query');
        return res.status(400).json({ message: 'Email is required' });
    }

    const query = `
        SELECT r.id, r.starting_point, r.destination, r.date, r.time, r.available_seats, r.price, r.ac, r.pets_allowed, 
               u.full_name AS driver_name, u.vehicle_number AS car_number, u.phone AS driver_phone, u.gender AS driver_gender, 
               b.seats_requested, b.status
        FROM rides r
        JOIN bookings b ON r.id = b.ride_id
        JOIN users u ON r.user_id = u.id
        WHERE b.user_id = (SELECT id FROM users WHERE email = ?)
        AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') > NOW()`;
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Booked rides fetch error:', err);
            return res.status(500).json({ message: 'Error fetching booked rides: ' + err.message });
        }
        const formattedResults = results.map(r => ({
            ...r,
            date: r.date ? r.date.toLocaleDateString('en-CA') : null,
            time: r.time ? r.time.slice(0, 5) : null
        }));
        console.log('Booked rides fetched (formatted):', formattedResults);
        res.json(formattedResults);
    });
});

// Edit a ride endpoint (unchanged)
app.put('/rides/:id', (req, res) => {
    const rideId = req.params.id;
    const { email, startingPoint, destination, date, time, availableSeats, price, ac, pets_allowed } = req.body;
    console.log('Edit ride request received:', { rideId, email, startingPoint, destination, date, time, availableSeats, price, ac, pets_allowed });

    if (!email || !startingPoint || !destination || !date || !time || !availableSeats || price === undefined || !ac || !pets_allowed) {
        console.error('Missing required fields:', { email, startingPoint, destination, date, time, availableSeats, price, ac, pets_allowed });
        return res.status(400).json({ message: 'All fields (email, starting point, destination, date, time, available seats, price, AC, pets allowed) are required' });
    }

    if (availableSeats > 2) {
        console.error('Available seats exceed maximum limit:', availableSeats);
        return res.status(400).json({ message: 'Maximum available seats is 2' });
    }

    const rideDateTimeStr = `${date} ${time}`;
    const rideDateTime = new Date(rideDateTimeStr);
    const now = new Date();
    if (rideDateTime <= now) {
        console.error('Edited ride date and time are in the past:', { rideDateTime, now });
        return res.status(400).json({ message: 'Cannot edit ride to a past date and time' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            console.error('User check error:', err);
            return res.status(500).json({ message: 'Error checking user: ' + err.message });
        }
        if (userResults.length === 0) {
            console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = userResults[0].id;
        const query = `
            UPDATE rides 
            SET starting_point = ?, destination = ?, date = ?, time = ?, available_seats = ?, price = ?, ac = ?, pets_allowed = ? 
            WHERE id = ? AND user_id = ?
            AND STR_TO_DATE(CONCAT(date, ' ', time), '%Y-%m-%d %H:%i') > NOW()`;
        db.query(query, [startingPoint, destination, date, time, availableSeats, price, ac, pets_allowed, rideId, userId], (err, result) => {
            if (err) {
                console.error('Ride edit error:', err);
                return res.status(500).json({ message: 'Error editing ride: ' + err.message });
            }
            if (result.affectedRows === 0) {
                console.log('Ride not found, expired, or not owned by user:', { rideId, email });
                return res.status(404).json({ message: 'Ride not found, expired, or you do not have permission to edit it' });
            }
            console.log('Ride edited successfully:', { rideId, email, date });
            res.json({ message: 'Ride edited successfully' });
        });
    });
});

// Delete a ride endpoint (unchanged)
app.delete('/rides/:id', (req, res) => {
    const rideId = req.params.id;
    const { email } = req.body;
    console.log('Delete ride request received:', { rideId, email });

    if (!email) {
        console.error('Email not provided');
        return res.status(400).json({ message: 'Email is required' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            console.error('User check error:', err);
            return res.status(500).json({ message: 'Error checking user: ' + err.message });
        }
        if (userResults.length === 0) {
            console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = userResults[0].id;
        const query = 'DELETE FROM rides WHERE id = ? AND user_id = ?';
        db.query(query, [rideId, userId], (err, result) => {
            if (err) {
                console.error('Ride delete error:', err);
                return res.status(500).json({ message: 'Error deleting ride: ' + err.message });
            }
            if (result.affectedRows === 0) {
                console.log('Ride not found or not owned by user:', { rideId, email });
                return res.status(404).json({ message: 'Ride not found or you do not have permission to delete it' });
            }
            console.log('Ride deleted successfully:', { rideId, email, affectedRows: result.affectedRows });
            res.status(200).json({ message: 'Ride deleted successfully' });
        });
    });
});

// Cancel a ride booking endpoint (unchanged)
app.delete('/bookings', (req, res) => {
    const { email, rideId } = req.body;
    console.log('Cancel booking request received:', { email, rideId });

    if (!email || !rideId) {
        console.error('Missing required fields:', { email, rideId });
        return res.status(400).json({ message: 'Email and ride ID are required' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], (err, userResults) => {
        if (err) {
            console.error('User check error:', err);
            return res.status(500).json({ message: 'Error checking user: ' + err.message });
        }
        if (userResults.length === 0) {
            console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = userResults[0].id;
        const rideQuery = 'SELECT date, time FROM rides WHERE id = ?';
        db.query(rideQuery, [rideId], (err, rideResults) => {
            if (err) {
                console.error('Ride fetch error:', err);
                return res.status(500).json({ message: 'Error fetching ride: ' + err.message });
            }
            if (rideResults.length === 0) {
                console.log('Ride not found:', { rideId });
                return res.status(404).json({ message: 'Ride not found' });
            }

            const rideDate = rideResults[0].date;
            const rideTime = rideResults[0].time.slice(0, 5);
            const rideDateTimeStr = `${rideDate} ${rideTime}`;
            const rideDateTime = new Date(rideDateTimeStr);
            const now = new Date();

            const timeDifferenceMs = rideDateTime - now;
            const oneHourMs = 60 * 60 * 1000;

            console.log('Ride DateTime (IST):', rideDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
            console.log('Current DateTime (IST):', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
            console.log('Time difference (ms):', timeDifferenceMs);

            if (timeDifferenceMs < oneHourMs) {
                console.log('Cancellation not allowed within 1 hour of ride:', { rideId, email });
                return res.status(403).json({ message: 'Cannot cancel booking within 1 hour of ride commencement' });
            }

            const deleteQuery = 'DELETE FROM bookings WHERE user_id = ? AND ride_id = ? AND status IN ("pending", "accepted")';
            db.query(deleteQuery, [userId, rideId], (err, result) => {
                if (err) {
                    console.error('Booking cancel error:', err);
                    return res.status(500).json({ message: 'Error canceling booking: ' + err.message });
                }
                if (result.affectedRows === 0) {
                    console.log('Booking not found, not pending/accepted, or not owned by user:', { rideId, email });
                    return res.status(404).json({ message: 'Booking not found, not in a cancellable state, or you do not have permission to cancel it' });
                }
                console.log('Booking canceled successfully:', { rideId, email, affectedRows: result.affectedRows });
                res.status(200).json({ message: 'Ride booking canceled successfully' });
            });
        });
    });
});

// Fetch all rides (unchanged)
app.get('/all-rides', (req, res) => {
    const query = `
        SELECT r.id, r.starting_point, r.destination, r.date, r.time, r.available_seats, r.price, r.ac, r.pets_allowed, 
               u.full_name AS driver_name, u.email AS driver_email, u.phone, u.gender,
               (r.available_seats - COALESCE((
                   SELECT SUM(b.seats_requested)
                   FROM bookings b
                   WHERE b.ride_id = r.id AND b.status = 'accepted'
               ), 0)) AS remaining_seats
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') > NOW()
        HAVING remaining_seats > 0`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching all rides:', err);
            return res.status(500).json({ message: 'Internal server error: ' + err.message });
        }
        const formattedResults = results.map(r => ({
            ...r,
            date: r.date ? r.date.toLocaleDateString('en-CA') : null,
            time: r.time ? r.time.slice(0, 5) : null
        }));
        console.log('All rides with seats fetched:', formattedResults);
        res.json(formattedResults);
    });
});

// Past booked rides endpoint
app.get('/past-booked-rides', (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const query = `
        SELECT 
            r.starting_point, 
            r.destination, 
            r.date, 
            r.time, 
            b.seats_requested, 
            b.status, 
            u.full_name AS driver_name, 
            u.phone AS driver_phone, 
            u.vehicle_number AS driver_vehicle_number
        FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        JOIN users u ON r.user_id = u.id
        WHERE b.user_id = (SELECT id FROM users WHERE email = ?)
        AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') < NOW()
        ORDER BY STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') DESC
    `;

    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error fetching past booked rides:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        const formattedResults = results.map(ride => ({
            starting_point: ride.starting_point,
            destination: ride.destination,
            date: ride.date.toLocaleDateString('en-CA'), // YYYY-MM-DD
            time: ride.time.slice(0, 5), // HH:MM
            seats_requested: ride.seats_requested,
            status: ride.status,
            driver_name: ride.driver_name,
            driver_phone: ride.driver_phone,
            driver_vehicle_number: ride.driver_vehicle_number
        }));

        console.log('Past booked rides fetched:', formattedResults.length);
        res.json(formattedResults);
    });
});

// Past published rides endpoint
app.get('/past-published-rides', (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const query = `
        SELECT 
            r.id, 
            r.starting_point, 
            r.destination, 
            r.date, 
            r.time, 
            r.available_seats,
            (SELECT GROUP_CONCAT(
                JSON_OBJECT(
                    'rider_name', u2.full_name,
                    'rider_phone', u2.phone,
                    'seats_requested', b.seats_requested,
                    'status', b.status
                )
            ) FROM bookings b
            JOIN users u2 ON b.user_id = u2.id
            WHERE b.ride_id = r.id) AS bookings
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE u.email = ?
        AND STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') < NOW()
        ORDER BY STR_TO_DATE(CONCAT(r.date, ' ', r.time), '%Y-%m-%d %H:%i') DESC
    `;

    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error fetching past published rides:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        const formattedResults = results.map(ride => ({
            id: ride.id,
            starting_point: ride.starting_point,
            destination: ride.destination,
            date: ride.date.toLocaleDateString('en-CA'),
            time: ride.time.slice(0, 5),
            available_seats: ride.available_seats,
            bookings: ride.bookings ? JSON.parse(`[${ride.bookings}]`) : []
        }));

        console.log('Past published rides fetched:', formattedResults.length);
        res.json(formattedResults);
    });
});

// Catch-all for undefined routes
app.use((req, res) => {
    console.log('Route not found:', req.method, req.url);
    res.status(404).json({ message: `Route not found: ${req.method} ${req.url}` });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});