# Carpooling-web-application
Overview
ShareRide is a backend service for a carpooling web application that allows users to register, log in, manage profiles, publish rides, search and book rides, and manage bookings. It includes an admin panel for overseeing users, rides, and bookings. The application is built with Node.js and Express, using MySQL as the database. User passwords are hashed with bcrypt, and admin authentication uses JWT.
Note:The backend exposes RESTful APIs that can be consumed by a frontend application (e.g., built with React, Angular, or plain HTML/JS).
Features

User Management:
User registration and login.
Profile updates (including phone, license, vehicle, and gender).
Validation for mobile numbers, vehicle numbers, and license numbers.

Ride Management:
Publish new rides with details like starting point, destination, date, time, seats, price, AC, and pets allowed.
Edit or delete published rides (only future rides).
Search and view available rides with remaining seats.
Book rides and manage bookings (request, accept, reject, cancel).

Booking Management:
Riders can request bookings and cancel them (if more than 1 hour before ride start).
Drivers can view pending requests, accept/reject them, and see booked riders.
View past booked and published rides.

Admin Panel:
Admin login with JWT authentication.
View all users and delete users (cascades to delete related rides and bookings).
View upcoming and previous rides, filtered by date or driver email.
View riders for a specific ride.

Security and Validation:
Password hashing.
Input validation for critical fields.
Timezone set to Asia/Kolkata (IST).
Ride publishing restricted to users with complete profiles (phone, gender, license, vehicle).

Database Integration:
MySQL database for storing users, admins, rides, and bookings.

Technologies Used

Node.js (Runtime)
Express.js (Web Framework)
MySQL2 (Database Driver)
Bcrypt (Password Hashing)
jsonwebtoken (JWT for Admin Auth)
CORS (Cross-Origin Resource Sharing)
Body-Parser (Request Parsing)

These are my backend file of carpooling webapplication. frontend I have not uploaded prepar a read me file for githubadmin.jsdb.jssetup-admin.jsserver.jsShareRide - Carpooling Web Application Backend
Overview
ShareRide is a backend service for a carpooling web application that allows users to register, log in, manage profiles, publish rides, search and book rides, and manage bookings. It includes an admin panel for overseeing users, rides, and bookings. The application is built with Node.js and Express, using MySQL as the database. User passwords are hashed with bcrypt, and admin authentication uses JWT.
Note: This repository contains only the backend code. The frontend is not included here. The backend exposes RESTful APIs that can be consumed by a frontend application (e.g., built with React, Angular, or plain HTML/JS).
Features

User Management:
User registration and login.
Profile updates (including phone, license, vehicle, and gender).
Validation for mobile numbers, vehicle numbers, and license numbers.

Ride Management:
Publish new rides with details like starting point, destination, date, time, seats, price, AC, and pets allowed.
Edit or delete published rides (only future rides).
Search and view available rides with remaining seats.
Book rides and manage bookings (request, accept, reject, cancel).

Booking Management:
Riders can request bookings and cancel them (if more than 1 hour before ride start).
Drivers can view pending requests, accept/reject them, and see booked riders.
View past booked and published rides.

Admin Panel:
Admin login with JWT authentication.
View all users and delete users (cascades to delete related rides and bookings).
View upcoming and previous rides, filtered by date or driver email.
View riders for a specific ride.

Security and Validation:
Password hashing.
Input validation for critical fields.
Timezone set to Asia/Kolkata (IST).
Ride publishing restricted to users with complete profiles (phone, gender, license, vehicle).

Database Integration:
MySQL database for storing users, admins, rides, and bookings.


Technologies Used

Node.js (Runtime)
Express.js (Web Framework)
MySQL2 (Database Driver)
Bcrypt (Password Hashing)
jsonwebtoken (JWT for Admin Auth)
CORS (Cross-Origin Resource Sharing)
Body-Parser (Request Parsing)

Prerequisites

Node.js (v14 or higher)
MySQL (e.g., via WampServer, XAMPP, or standalone installation). Default config uses port 3308, user 'root', no password.
Git (for cloning the repository)

Installation

Clone the Repository:textgit clone https://github.com/your-username/share-ride-backend.git
cd share-ride-backend
Install Dependencies:textnpm install
Set Up the Database:
Create a MySQL database named share_ride.
Run the following SQL script to create the required tables:SQLCREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    license_number VARCHAR(50),
    vehicle_number VARCHAR(20),
    gender ENUM('Male', 'Female', 'Other')
);

CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE rides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    starting_point VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    available_seats INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    ac BOOLEAN NOT NULL,
    pets_allowed BOOLEAN NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ride_id INT NOT NULL,
    seats_requested INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

Configure Database Connection:
Edit db.js if your MySQL setup differs (e.g., host, user, password, port).

Set Up Admin Account:
Run the admin setup script:textnode setup-admin.js
This creates an admin user with username admin and password admin123 (hashed). If it already exists, it will log a message.

Start the Server:textnode server.js
The server runs on http://localhost:3000.

Usage

API Base URL:http://localhost:3000
Test the server health: GET /health
Integrate with your frontend by making HTTP requests to the endpoints below.
For admin routes, obtain a JWT token via POST /admin/login and include it in the Authorization header as Bearer <token>.

Key API Endpoints
User Routes

POST /register: Register a new user (body: { fullName, email, password, phone }).
POST /login: User login (body: { email, password }).
GET /profile?email=<email>: Fetch user profile.
POST /profile/update: Update profile (body: { fullName, email, phone, licenseNumber, vehicleNumber, gender }).

Ride Routes

POST /publish-ride: Publish a ride (body: { email, startingPoint, destination, date, time, availableSeats, price, ac, pets_allowed }).
GET /rides?email=<email>: Fetch user's published rides.
PUT /rides/<rideId>: Edit a ride (body: same as publish).
DELETE /rides/<rideId>: Delete a ride (body: { email }).
GET /all-rides: Fetch all available rides.
GET /past-booked-rides?email=<email>: Fetch past booked rides.
GET /past-published-rides?email=<email>: Fetch past published rides.

Booking Routes

POST /book-ride: Book a ride (body: { email, rideId, seats }).
GET /bookings?email=<email>: Fetch user's bookings.
PUT /bookings/accept: Accept a booking (body: { bookingId, driverEmail }).
PUT /bookings/reject: Reject a booking (body: { bookingId, driverEmail }).
DELETE /bookings: Cancel a booking (body: { email, rideId }).

Admin Routes (Protected by JWT)

POST /admin/login: Admin login (body: { username, password }).
GET /admin/users: Fetch all users.
DELETE /admin/users/<email>: Delete a user.
GET /admin/upcoming-rides?date=<date>&email=<email>: Fetch upcoming rides (next 7 days).
GET /admin/previous-rides?date=<date>&email=<email>: Fetch previous rides.
GET /admin/rides/<rideId>/riders: Fetch riders for a ride.

For full details, refer to the code in server.js and admin.js.
Contributing
Contributions are welcome! Please fork the repository and submit a pull request. Ensure code follows best practices and includes relevant tests.
