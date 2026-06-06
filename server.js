const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// static frontend
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// SESSION CONFIG
// ============================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set true in HTTPS production later
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ============================================
// DATABASE CONNECTION
// ============================================
const db = mysql.createPool({
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
      password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ,


    ssl: {
        ca: fs.readFileSync("./isrgrootx1.pem"),
        rejectUnauthorized: true
    },
    
   waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promiseDb = db.promise();

// ============================================
// ROOT
// ============================================
app.get('/', (req, res) => {
    res.send("Library Management System Backend is Running 🚀");
});

// ============================================
// LOGIN API
// ============================================
app.post('/api/login', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const [users] = await promiseDb.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (!users.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // demo login (you can upgrade to bcrypt later)
        if (password === 'admin123' || username === 'admin' || email === 'admin@library.com') {
            req.session.userId = user.id;

            return res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.username,
                    email: user.email,
                    type: user.type
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid password'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// BOOKS
// ============================================
app.get('/api/books', async (req, res) => {
    try {
        const [rows] = await promiseDb.execute(
            'SELECT * FROM books ORDER BY title'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});

app.post('/api/books', async (req, res) => {
    const { title, author, genre, copies } = req.body;

    try {
        const [result] = await promiseDb.execute(
            'INSERT INTO books (title, author, genre, copies, available) VALUES (?, ?, ?, ?, ?)',
            [title, author, genre, copies, copies]
        );

        res.json({
            success: true,
            bookId: result.insertId
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to add book' });
    }
});

// ============================================
// MEMBERS
// ============================================
app.get('/api/members', async (req, res) => {
    try {
        const [rows] = await promiseDb.execute(
            'SELECT * FROM members ORDER BY name'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

app.post('/api/members', async (req, res) => {
    const { name, email, phone, type, expiry } = req.body;

    const memberId = 'LIB' + Date.now().toString().slice(-6);

    try {
        await promiseDb.execute(
            'INSERT INTO members (id, name, email, phone, type, membership_expiry) VALUES (?, ?, ?, ?, ?, ?)',
            [memberId, name, email, phone, type, expiry]
        );

        res.json({
            success: true,
            memberId
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// ============================================
// ISSUED BOOKS
// ============================================
app.get('/api/issued', async (req, res) => {
    try {
        const [rows] = await promiseDb.execute(`
            SELECT ib.*, b.title, m.name
            FROM issued_books ib
            JOIN books b ON ib.book_id = b.id
            JOIN members m ON ib.member_id = m.id
            WHERE ib.status = 'issued'
        `);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch issued books' });
    }
});

// ============================================
// START SERVER (IMPORTANT FOR RENDER)
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// ============================================
// DB CHECK
// ============================================
db.getConnection((err, conn) => {
    if (err) {
        console.error("DB Connection Failed:", err);
    } else {
        console.log("MySQL Connected Successfully!");
        conn.release();
    }
});