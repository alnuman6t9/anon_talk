const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { sql } = require('@vercel/postgres');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- 1. SPECIAL SETUP ROUTE (Run this once) ---
app.get('/api/init', async (req, res) => {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS replies (
                id SERIAL PRIMARY KEY,
                post_id INTEGER REFERENCES posts(id),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        res.send("Database tables created successfully! You can now use the app.");
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 2. GET ALL POSTS ---
app.get('/api/posts', async (req, res) => {
    try {
        // Fetch posts and replies in parallel
        const postsResult = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
        const repliesResult = await sql`SELECT * FROM replies ORDER BY created_at ASC`;

        // Combine them in JavaScript
        const posts = postsResult.rows.map(post => ({
            ...post,
            replies: repliesResult.rows.filter(r => r.post_id === post.id)
        }));

        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 3. CREATE POST ---
app.post('/api/posts', async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    try {
        const result = await sql`
            INSERT INTO posts (content, likes) 
            VALUES (${content}, 0) 
            RETURNING *;
        `;
        res.json({ ...result.rows[0], replies: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 4. CREATE REPLY ---
app.post('/api/posts/:id/reply', async (req, res) => {
    const { content } = req.body;
    const postId = req.params.id;

    try {
        await sql`INSERT INTO replies (post_id, content) VALUES (${postId}, ${content})`;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 5. LIKE POST ---
app.post('/api/posts/:id/like', async (req, res) => {
    const postId = req.params.id;
    try {
        await sql`UPDATE posts SET likes = likes + 1 WHERE id = ${postId}`;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;