let currentTab = 'new';
let lastPostCount = 0;
const box = document.getElementById('box');
const feed = document.getElementById('feed');

// Character counter
box.oninput = () => document.getElementById('chars').innerText = `${box.value.length}/500`;

// 1. Fetch data smoothly
async function load(isAuto = false) {
    try {
        const res = await fetch(`/api/posts?filter=${currentTab}`);
        const posts = await res.json();
        
        // Only re-render if something actually changed (new post, new like, or new reply)
        // We use a simple JSON string check to see if the data is different
        const currentState = JSON.stringify(posts);
        if (sessionStorage.getItem('last_state') !== currentState) {
            if (isAuto) checkNotif(posts);
            render(posts);
            sessionStorage.setItem('last_state', currentState);
        }
    } catch (e) { console.error("Sync error", e); }
}

// 2. Render UI (No flickering)
function render(posts) {
    // Save scroll position so the page doesn't jump
    const scrollPos = window.scrollY;
    
    feed.innerHTML = posts.map(p => `
        <div class="post">
            <div class="post-text" style="white-space: pre-wrap;">${escapeHTML(p.content)}</div>
            <div class="actions">
                <span class="action-link" onclick="like(${p.id})">♥ ${p.likes}</span>
                <span class="action-link" onclick="toggleReplyBox(${p.id})">Reply</span>
                <span>${new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="replies">
                ${p.replies.map(r => `<div class="reply">↳ ${escapeHTML(r.content)}</div>`).join('')}
                <input id="ri-${p.id}" class="r-input" placeholder="Type a reply..." onkeydown="if(event.key==='Enter') reply(${p.id}, this)">
            </div>
        </div>
    `).join('');
}

function toggleReplyBox(id) {
    const el = document.getElementById(`ri-${id}`);
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
    if(el.style.display === 'block') el.focus();
}

// 3. Actions
async function sendPost() {
    const content = box.value.trim();
    if (!content) return;
    const res = await fetch('/api/posts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content})});
    const data = await res.json();
    
    const mine = JSON.parse(localStorage.getItem('mine') || '[]');
    mine.push(data.id);
    localStorage.setItem('mine', JSON.stringify(mine));
    
    box.value = '';
    document.getElementById('chars').innerText = "0/500";
    load();
}

async function like(id) {
    const liked = JSON.parse(localStorage.getItem('liked') || '[]');
    if (liked.includes(id)) return;
    
    // UI update for speed
    await fetch(`/api/posts/${id}/like`, {method:'POST'});
    liked.push(id);
    localStorage.setItem('liked', JSON.stringify(liked));
    load();
}

async function reply(id, el) {
    if (!el.value.trim()) return;
    await fetch(`/api/posts/${id}/reply`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content: el.value})});
    el.value = '';
    load();
}

function setTab(t, el) {
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentTab = t;
    sessionStorage.removeItem('last_state'); // Force re-render on tab change
    load();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[tag]));
}

// 4. Notifications
function checkNotif(posts) {
    const mine = JSON.parse(localStorage.getItem('mine') || '[]');
    mine.forEach(id => {
        const post = posts.find(p => p.id === id);
        if (post) {
            const count = localStorage.getItem(`r_${id}`) || 0;
            if (post.replies.length > count) {
                const n = document.getElementById('notif');
                n.classList.add('show');
                setTimeout(() => n.classList.remove('show'), 4000);
                localStorage.setItem(`r_${id}`, post.replies.length);
            }
        }
    });
}

// --- CONTROLS ---

load(); // Initial load

// Check for new data every 5 seconds (Silent background sync)
setInterval(() => load(true), 5000); 

// FULL PAGE REFRESH only every 30 minutes
setInterval(() => {
    location.reload();
}, 1800000);
