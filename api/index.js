const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { sql } = require('@vercel/postgres');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

const ADMIN_PW = 'Noman123'; // <--- SET YOUR PASSWORD HERE

// --- 1. SETUP ---
app.get('/api/init', async (req, res) => {
    try {
        await sql`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, likes INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS replies (id SERIAL PRIMARY KEY, post_id INTEGER REFERENCES posts(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        res.send("Database initialized successfully.");
    } catch (e) { res.status(500).send(e.message); }
});

// --- 2. GET POSTS (FILTERED) ---
app.get('/api/posts', async (req, res) => {
    const { filter } = req.query;
    try {
        let postsQuery;
        if (filter === 'hot') postsQuery = sql`SELECT * FROM posts ORDER BY likes DESC, created_at DESC LIMIT 50`;
        else if (filter === 'old') postsQuery = sql`SELECT * FROM posts WHERE created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 50`;
        else postsQuery = sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT 50`;

        const postsResult = await postsQuery;
        const repliesResult = await sql`SELECT * FROM replies ORDER BY created_at ASC`;

        const posts = postsResult.rows.map(post => ({
            ...post,
            replies: repliesResult.rows.filter(r => r.post_id === post.id)
        }));
        res.json(posts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 3. CREATE POST ---
app.post('/api/posts', async (req, res) => {
    const result = await sql`INSERT INTO posts (content) VALUES (${req.body.content}) RETURNING *`;
    res.json(result.rows[0]);
});

// --- 4. REPLY & LIKE ---
app.post('/api/posts/:id/reply', async (req, res) => {
    await sql`INSERT INTO replies (post_id, content) VALUES (${req.params.id}, ${req.body.content})`;
    res.json({ success: true });
});

app.post('/api/posts/:id/like', async (req, res) => {
    await sql`UPDATE posts SET likes = likes + 1 WHERE id = ${req.params.id}`;
    res.json({ success: true });
});

// --- 5. ADMIN DELETE ---
app.post('/api/posts/:id/delete', async (req, res) => {
    if (req.body.password !== ADMIN_PW) return res.status(403).json({ error: "Wrong Password" });
    try {
        await sql`DELETE FROM replies WHERE post_id = ${req.params.id}`;
        await sql`DELETE FROM posts WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = app;
