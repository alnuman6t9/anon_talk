let currentTab = 'new';
const box = document.getElementById('box');
const feed = document.getElementById('feed');

// Character counter
box.oninput = () => document.getElementById('chars').innerText = `${box.value.length}/500`;

// 1. Fetch data
async function load(isAuto = false) {
    const res = await fetch(`/api/posts?filter=${currentTab}`);
    const posts = await res.json();
    if (isAuto) checkNotif(posts);
    render(posts);
}

// 2. Render UI
function render(posts) {
    feed.innerHTML = posts.map(p => `
        <div class="post">
            <div>${p.content}</div>
            <div class="actions">
                <span class="action-link" onclick="like(${p.id})">♥ ${p.likes}</span>
                <span class="action-link" onclick="document.getElementById('ri-${p.id}').style.display='block'">Reply</span>
                <span>${new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="replies">
                ${p.replies.map(r => `<div class="reply">↳ ${r.content}</div>`).join('')}
                <input id="ri-${p.id}" class="r-input" placeholder="Enter to reply..." onkeydown="if(event.key==='Enter') reply(${p.id}, this)">
            </div>
        </div>
    `).join('');
}

// 3. Actions
async function sendPost() {
    if (!box.value.trim()) return;
    const res = await fetch('/api/posts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content: box.value})});
    const data = await res.json();
    const mine = JSON.parse(localStorage.getItem('mine') || '[]');
    mine.push(data.id);
    localStorage.setItem('mine', JSON.stringify(mine));
    box.value = '';
    load();
}

async function like(id) {
    const liked = JSON.parse(localStorage.getItem('liked') || '[]');
    if (liked.includes(id)) return;
    await fetch(`/api/posts/${id}/like`, {method:'POST'});
    liked.push(id);
    localStorage.setItem('liked', JSON.stringify(liked));
    load();
}

async function reply(id, el) {
    await fetch(`/api/posts/${id}/reply`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content: el.value})});
    el.value = '';
    load();
}

function setTab(t, el) {
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentTab = t;
    load();
}

// 4. Notifications & Live Feed (Auto-refresh every 5s)
function checkNotif(posts) {
    const mine = JSON.parse(localStorage.getItem('mine') || '[]');
    mine.forEach(id => {
        const post = posts.find(p => p.id === id);
        if (post) {
            const count = localStorage.getItem(`r_${id}`) || 0;
            if (post.replies.length > count) {
                const n = document.getElementById('notif');
                n.classList.add('show');
                setTimeout(() => n.classList.remove('show'), 3000);
                localStorage.setItem(`r_${id}`, post.replies.length);
            }
        }
    });
}

load();
setInterval(() => load(true), 5000); // This makes it a "Live Feed"
