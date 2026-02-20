const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',         // WampServer default
    password: '',         // WampServer default: no password
    database: 'share_ride',
    port: 3308           // Match WampServer’s MySQL port
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

module.exports = db;