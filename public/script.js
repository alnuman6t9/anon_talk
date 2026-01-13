let currentTab = 'new';
const box = document.getElementById('box');
const feed = document.getElementById('feed');

box.oninput = () => document.getElementById('chars').innerText = `${box.value.length}/500`;

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
            <div style="white-space:pre-wrap">${escapeHTML(p.content)}</div>
            <div class="actions">
                <span class="action-link" onclick="like(${p.id})">♥ ${p.likes}</span>
                <span class="action-link" onclick="toggleRep(${p.id})">Reply</span>
                <span>${new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                ${isAdmin ? `<span class="action-link" style="color:#ef4444;margin-left:auto" onclick="del(${p.id})">Delete</span>` : ''}
            </div>
            <div class="replies">
                ${p.replies.map(r => `<div class="reply">↳ ${escapeHTML(r.content)}</div>`).join('')}
                <input id="ri-${p.id}" class="r-input" placeholder="Enter to reply..." onkeydown="if(event.key==='Enter') reply(${p.id}, this)">
            </div>
        </div>
    `).join('');
}

async function sendPost() {
    if (!box.value.trim()) return;
    const res = await fetch('/api/posts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content: box.value})});
    const data = await res.json();
    const mine = JSON.parse(localStorage.getItem('mine') || '[]');
    mine.push(data.id);
    localStorage.setItem('mine', JSON.stringify(mine));
    box.value = ''; load();
}

async function like(id) {
    const liked = JSON.parse(localStorage.getItem('liked') || '[]');
    if (liked.includes(id)) return;
    await fetch(`/api/posts/${id}/like`, {method:'POST'});
    liked.push(id); localStorage.setItem('liked', JSON.stringify(liked));
    load();
}

async function reply(id, el) {
    if (!el.value.trim()) return;
    await fetch(`/api/posts/${id}/reply`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content: el.value})});
    el.value = ''; load();
}

function toggleRep(id) {
    const el = document.getElementById(`ri-${id}`);
    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
}

function setTab(t, el) {
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentTab = t; load();
}

// Notifications Logic
function checkNotifications(posts) {
    const mine = JSON.parse(localStorage.getItem('mine') || '[]');
    let history = JSON.parse(localStorage.getItem('notif_history') || '[]');
    let updated = false;

    mine.forEach(pid => {
        const p = posts.find(x => x.id === pid);
        if (p && p.replies.length > 0) {
            p.replies.forEach(r => {
                const rid = `r_${pid}_${new Date(r.created_at).getTime()}`;
                if (!history.find(h => h.id === rid)) {
                    history.unshift({ id: rid, parent: p.content.substring(0, 20), text: r.content });
                    updated = true;
                }
            });
        }
    });

    if (updated) {
        localStorage.setItem('notif_history', JSON.stringify(history.slice(0, 10)));
        renderNotifs();
    }
}

function renderNotifs() {
    const history = JSON.parse(localStorage.getItem('notif_history') || '[]');
    const sect = document.getElementById('notif-section');
    if (history.length === 0) { sect.style.display = 'none'; return; }
    sect.style.display = 'block';
    document.getElementById('notif-list').innerHTML = history.map(n => `<div class="notif-item"><small>On: "${escapeHTML(n.parent)}..."</small><div>${escapeHTML(n.text)}</div></div>`).join('');
}

window.clearNotifs = () => { localStorage.setItem('notif_history', '[]'); renderNotifs(); };

// Admin
window.loginAdmin = (pw) => { sessionStorage.setItem('isAdmin', 'true'); sessionStorage.setItem('apw', pw); load(); };
async function del(id) {
    if(!confirm("Delete?")) return;
    await fetch(`/api/posts/${id}/delete`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({password: sessionStorage.getItem('apw')})});
    load();
}

function escapeHTML(str) { return str.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t])); }

load(); renderNotifs();
setInterval(() => location.reload(), 1800000);
