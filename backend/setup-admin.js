const db = require('./db.js'); // Adjust path if db.js is in a different folder
const bcrypt = require('bcrypt');

async function setupAdmin() {
    const username = 'admin';
    const password = 'admin123';
    try {
        const hash = await bcrypt.hash(password, 10);
        db.query('INSERT INTO admins (username, password) VALUES (?, ?)', [username, hash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log('Admin already exists');
                } else {
                    throw err;
                }
            } else {
                console.log('Admin created:', { username, id: result.insertId });
            }
            db.end(); // Optional: Close connection if not reused
        });
    } catch (error) {
        console.error('Error setting up admin:', error);
        db.end();
    }
}

setupAdmin();