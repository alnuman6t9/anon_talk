const feed = document.getElementById('feed');
const loading = document.getElementById('loading');
const postInput = document.getElementById('postContent');
const charCount = document.getElementById('charCount');

// Character counter
postInput.addEventListener('input', () => {
    charCount.innerText = `${postInput.value.length} / 500`;
});

async function loadPosts() {
    try {
        const res = await fetch('/api/posts');
        const posts = await res.json();
        loading.style.display = 'none';
        renderPosts(posts);
    } catch (e) {
        loading.innerText = "Error syncing with the void.";
    }
}

function renderPosts(posts) {
    feed.innerHTML = posts.map(post => `
        <div class="post">
            <div class="post-content">${escapeHTML(post.content)}</div>
            <div class="actions">
                <div class="like-btn" onclick="likePost(${post.id})">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    <span>${post.likes}</span>
                </div>
                <span>${new Date(post.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
            </div>
            <div class="replies">
                ${post.replies.map(r => `<div class="reply">${escapeHTML(r.content)}</div>`).join('')}
                <input type="text" class="reply-input" placeholder="Whisper a reply..." 
                       onkeydown="if(event.key === 'Enter') submitReply(${post.id}, this)">
            </div>
        </div>
    `).join('');
}

async function submitPost() {
    const btn = document.getElementById('postBtn');
    if (!postInput.value.trim()) return;
    
    btn.innerText = "Posting...";
    btn.disabled = true;

    await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postInput.value })
    });

    postInput.value = '';
    charCount.innerText = "0 / 500";
    btn.innerText = "Post Anonymously";
    btn.disabled = false;
    loadPosts();
}

async function submitReply(postId, el) {
    if (!el.value.trim()) return;
    const originalPlaceholder = el.placeholder;
    el.placeholder = "Replying...";
    
    await fetch(`/api/posts/${postId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: el.value })
    });
    
    loadPosts();
}

async function likePost(id) {
    // Optimistic UI: increase count locally for speed
    await fetch(`/api/posts/${id}/like`, { method: 'POST' });
    loadPosts();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

loadPosts();
