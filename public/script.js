const feed = document.getElementById('feed');
const loading = document.getElementById('loading');

async function loadPosts() {
    try {
        const res = await fetch('/api/posts');
        const posts = await res.json();
        loading.style.display = 'none';
        renderPosts(posts);
    } catch (e) {
        loading.innerText = "Error loading posts.";
    }
}

function renderPosts(posts) {
    feed.innerHTML = posts.map(post => `
        <div class="post">
            <div class="post-content">${escapeHTML(post.content)}</div>
            <div class="actions" onclick="likePost(${post.id})">
                ♥ ${post.likes} Likes • ${new Date(post.created_at).toLocaleDateString()}
            </div>
            <div class="replies">
                ${post.replies.map(r => `<div class="reply">↳ ${escapeHTML(r.content)}</div>`).join('')}
                <input type="text" class="reply-input" placeholder="Reply..." 
                       onkeydown="if(event.key === 'Enter') submitReply(${post.id}, this)">
            </div>
        </div>
    `).join('');
}

async function submitPost() {
    const input = document.getElementById('postContent');
    if (!input.value.trim()) return;
    
    await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.value })
    });
    input.value = '';
    loadPosts();
}

async function submitReply(postId, el) {
    if (!el.value.trim()) return;
    await fetch(`/api/posts/${postId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: el.value })
    });
    loadPosts();
}

async function likePost(id) {
    await fetch(`/api/posts/${id}/like`, { method: 'POST' });
    loadPosts();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

loadPosts();