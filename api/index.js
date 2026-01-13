const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { sql } = require('@vercel/postgres');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database Init Route
app.get('/api/init', async (req, res) => {
    try {
        await sql`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, likes INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS replies (id SERIAL PRIMARY KEY, post_id INTEGER REFERENCES posts(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        res.send("Database Ready.");
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/posts', async (req, res) => {
    const { filter } = req.query;
    try {
        let query;
        if (filter === 'hot') query = sql`SELECT * FROM posts ORDER BY likes DESC, created_at DESC LIMIT 50`;
        else if (filter === 'old') query = sql`SELECT * FROM posts WHERE created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 50`;
        else query = sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT 50`;

        const postsResult = await query;
        const repliesResult = await sql`SELECT * FROM replies ORDER BY created_at ASC`;

        const posts = postsResult.rows.map(post => ({
            ...post,
            replies: repliesResult.rows.filter(r => r.post_id === post.id)
        }));
        res.json(posts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/posts', async (req, res) => {
    const { content } = req.body;
    const result = await sql`INSERT INTO posts (content) VALUES (${content}) RETURNING *`;
    res.json(result.rows[0]);
});

app.post('/api/posts/:id/reply', async (req, res) => {
    await sql`INSERT INTO replies (post_id, content) VALUES (${req.params.id}, ${req.body.content})`;
    res.json({ success: true });
});

app.post('/api/posts/:id/like', async (req, res) => {
    await sql`UPDATE posts SET likes = likes + 1 WHERE id = ${req.params.id}`;
    res.json({ success: true });
});

module.exports = app;
