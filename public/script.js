let currentTab = 'new';
const box = document.getElementById('box');
const feed = document.getElementById('feed');

// Sync UI and Initial Load
box.oninput = () => document.getElementById('chars').innerText = `${box.value.length}/500`;
load();

// 30-Min Refresh for Stability
setInterval(() => location.reload(), 1800000);

async function load() {
    const res = await fetch(`/api/posts?filter=${currentTab}`);
    const posts = await res.json();
    checkNotifications(posts);
    render(posts);
}

function render(posts) {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    feed.innerHTML = posts.map(p => `
        <div class="post">
            <div class="post-text">${escapeHTML(p.content)}</div>
            <div class="actions">
                <span class="action-link" onclick="like(${p.id})">♥ ${p.likes}</span>
                <span class="action-link" onclick="toggleReply(${p.id})">Reply</span>
                <span>${new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                ${isAdmin ? `<span class="action-link delete-btn" onclick="deletePost(${p.id})">Delete</span>` : ''}
            </div>
            <div class="replies">
                ${p.replies.map(r => `<div class="reply">↳ ${escapeHTML(r.content)}</div>`).join('')}
                <input id="ri-${p.id}" class="r-input" placeholder="Type a reply..." onkeydown="if(event.key==='Enter') reply(${p.id}, this)">
            </div>
        </div>
    `).join('');
}

async function sendPost() {
    const content = box.value.trim();
    if (!content) return;
    const res = await fetch('/api/posts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content})});
    const post = await res.json();
    const mine = JSON.parse(localStorage.getItem('mine') || '[]');
    mine.push(post.id);
    localStorage.setItem('mine', JSON.stringify(mine));
    box.value = '';
    load();
}

async function like(id) {
    const liked = JSON.parse(localStorage.getItem('liked') || '[]');
    if (liked.includes(id)) return alert("Already reacted.");
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

function toggleReply(id) {
    const el = document.getElementById(`ri-${id}`);
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
}

function setTab(t, el) {
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentTab = t;
    load();
}

// Admin Logic: Type loginAdmin('yourpassword') in Console
window.loginAdmin = (pw) => {
    sessionStorage.setItem('isAdmin', 'true');
    sessionStorage.setItem('adminPw', pw);
    load();
    console.log("Admin activated.");
};

async function deletePost(id) {
    if(!confirm("Delete forever?")) return;
    const pw = sessionStorage.getItem('adminPw');
    const res = await fetch(`/api/posts/${id}/delete`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({password: pw})
    });
    if(res.ok) load(); else alert("Unauthorized");
}

function checkNotifications(posts) {
    const mine = JSON.parse(localStorage.getItem('mine') || '[]');
    let triggered = false;
    mine.forEach(id => {
        const p = posts.find(x => x.id === id);
        if (p) {
            const lastCount = localStorage.getItem(`notif_${id}`) || 0;
            if (p.replies.length > lastCount) {
                triggered = true;
                localStorage.setItem(`notif_${id}`, p.replies.length);
            }
        }
    });
    if (triggered) {
        const t = document.getElementById('notif');
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 5000);
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[tag]));
}
