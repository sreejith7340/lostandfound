// =============================================
// ADMIN DASHBOARD JavaScript
// =============================================

const API = '/api';
let authToken = localStorage.getItem('adminToken');
let systemLogs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
let notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');

// Auth guard
if (!authToken) { window.location.href = '/admin/login'; }

// Set admin info in sidebar
const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
if (adminUser.name) {
    document.getElementById('adminName').textContent = adminUser.name;
    document.getElementById('adminAvatar').textContent = adminUser.name[0].toUpperCase();
}

const headers = () => ({ 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' });

// =============================================
// NAVIGATION
// =============================================
const pageTitles = {
    'dashboard': 'Dashboard', 'manage-items': 'Manage Items',
    'lost-items': 'Lost Items Reported', 'reporters': 'Reporters',
    'claims': 'Claim Requests', 'claimed-items': 'Claimed Items',
    'notifications': 'Notifications', 'users': 'User Management',
    'logs': 'System Logs'
};

function navigateTo(page) {
    document.querySelectorAll('.section-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');
    const link = document.querySelector(`.sidebar-link[data-page="${page}"]`);
    if (link) link.classList.add('active');
    document.getElementById('topbarTitle').textContent = pageTitles[page] || page;
    // close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    loadPageData(page);
}

function loadPageData(page) {
    if (page === 'dashboard') loadDashboard();
    else if (page === 'manage-items') loadAllItems();
    else if (page === 'lost-items') loadLostItems();
    else if (page === 'reporters') loadReporters();
    else if (page === 'claims') loadClaims();
    else if (page === 'claimed-items') loadClaimedItems();
    else if (page === 'notifications') renderNotifications();
    else if (page === 'users') loadUsers();
    else if (page === 'logs') renderLogs();
}

// Sidebar link clicks
document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
});
document.querySelectorAll('[data-page]').forEach(el => {
    if (!el.classList.contains('sidebar-link')) {
        el.addEventListener('click', () => navigateTo(el.dataset.page));
    }
});

// Notification icon
document.querySelector('.icon-btn[data-page="notifications"]').addEventListener('click', () => navigateTo('notifications'));

// Hamburger
document.getElementById('hamburgerBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin/login';
});

// =============================================
// DASHBOARD
// =============================================
async function loadDashboard() {
    try {
        const res = await fetch(`${API}/admin/stats`, { headers: headers() });
        const data = await res.json();
        if (!data.success) { redirectIfUnauth(res); return; }
        const s = data.stats;

        animateNum('s-total', s.totalItems);
        animateNum('s-lost', s.totalLost);
        animateNum('s-found', s.totalFound);
        animateNum('s-claims', s.totalClaims);
        animateNum('s-pending', s.pendingClaims);

        // badge
        document.getElementById('pendingClaimsBadge').textContent = s.pendingClaims;
        if (s.pendingClaims > 0) document.getElementById('notifDot').style.display = 'block';

        // progress bars
        const total = s.totalItems || 1;
        setBar('lp', s.byStatus.lost.pending, total);
        setBar('la', s.byStatus.lost.approved, total);
        setBar('fp', s.byStatus.found.pending, total);
        setBar('fa', s.byStatus.found.approved, total);
        const claimed = s.byStatus.lost.claimed + s.byStatus.found.claimed;
        setBar('cl', claimed, total);

        // recent activity
        const recent = [...s.recentLost.map(i => ({ ...i, _t: 'lost' })), ...s.recentFound.map(i => ({ ...i, _t: 'found' }))]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
        document.getElementById('recentActivity').innerHTML = recent.length
            ? recent.map(i => `<tr>
          <td><strong>${escHtml(i.itemName)}</strong></td>
          <td><span class="badge-status ${i._t === 'lost' ? 'bs-pending' : 'bs-approved'}">${i._t}</span></td>
          <td>–</td>
          <td>${fmtDate(i.createdAt)}</td>
          <td><span class="badge-status bs-${i.status}">${i.status}</span></td>
        </tr>`).join('')
            : '<tr><td colspan="5" class="empty-state"><i class="bi bi-inbox"></i> No recent activity</td></tr>';

        // categories
        document.getElementById('categoryBreakdown').innerHTML = s.lostByCategory.length
            ? s.lostByCategory.map(c => {
                const pct = Math.round((c.count / s.totalLost) * 100) || 0;
                return `<div class="progress-item">
            <div class="progress-label"><span>${c._id}</span><span>${c.count}</span></div>
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%;background:var(--primary);"></div></div>
          </div>`;
            }).join('')
            : '<p style="color:var(--muted);font-size:0.85rem;">No data yet.</p>';

        // Add notification for pending claims
        if (s.pendingClaims > 0) {
            addNotification('info', `${s.pendingClaims} pending claim request(s) awaiting review.`);
        }
    } catch (e) { console.error(e); }
}

function setBar(key, val, total) {
    const pct = Math.min(Math.round((val / total) * 100), 100);
    const bar = document.getElementById(`bar-${key}`);
    const pctEl = document.getElementById(`pct-${key}`);
    if (bar) { bar.style.width = '0%'; setTimeout(() => bar.style.width = pct + '%', 100); }
    if (pctEl) pctEl.textContent = val;
}

// =============================================
// ALL ITEMS
// =============================================
async function loadAllItems() {
    const tbody = document.getElementById('allItemsTable');
    tbody.innerHTML = loadingRow(8);
    try {
        const type = document.getElementById('filterItemType').value;
        const status = document.getElementById('filterItemStatus').value;
        let url = `${API}/admin/items?type=${type}`;
        if (status) url += `&status=${status}`;
        const res = await fetch(url, { headers: headers() });
        const data = await res.json();
        const rows = [];
        if (data.lost) data.lost.forEach(i => rows.push(renderItemRow(i, 'lost')));
        if (data.found) data.found.forEach(i => rows.push(renderItemRow(i, 'found')));
        tbody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="8" class="empty-state"><i class="bi bi-inbox"></i> No items found</td></tr>';
    } catch (e) { tbody.innerHTML = errorRow(8); }
}

document.getElementById('filterItemType').addEventListener('change', loadAllItems);
document.getElementById('filterItemStatus').addEventListener('change', loadAllItems);

function renderItemRow(item, type) {
    const isLost = type === 'lost';
    const date = isLost ? item.dateLost : item.dateFound;
    const location = isLost ? item.locationLost : item.locationFound;
    const imgHtml = item.image
        ? `<img src="${item.image}" class="item-thumb" alt="${item.itemName}" />`
        : `<div class="item-thumb-ph">${catEmoji(item.category)}</div>`;
    return `<tr>
    <td>${imgHtml}</td>
    <td><strong>${escHtml(item.itemName)}</strong><br/><span style="font-size:0.75rem;color:var(--muted);">${escHtml(location)}</span></td>
    <td><span class="badge-status ${isLost ? 'bs-pending' : 'bs-approved'}">${type}</span></td>
    <td>${item.category}</td>
    <td style="font-size:0.8rem;">${escHtml(location)}</td>
    <td style="font-size:0.8rem;">${fmtDate(date)}</td>
    <td><span class="badge-status bs-${item.status}">${item.status}</span></td>
    <td style="white-space:nowrap;">
      ${item.status === 'pending' ? `
        <button class="btn-sm-action btn-approve" onclick="updateStatus('${type}','${item._id}','approved')"><i class="bi bi-check"></i> Approve</button>
        <button class="btn-sm-action btn-reject" onclick="updateStatus('${type}','${item._id}','rejected')"><i class="bi bi-x"></i> Reject</button>
      ` : ''}
      <button class="btn-sm-action btn-edit" onclick="openEditModal('${type}','${item._id}','${escAttr(item.itemName)}','${item.category}','${escAttr(item.description)}','${item.status}','${escAttr(item.adminNote || '')}')"><i class="bi bi-pencil"></i></button>
      <button class="btn-sm-action btn-delete" onclick="deleteItem('${type}','${item._id}')"><i class="bi bi-trash"></i></button>
    </td>
  </tr>`;
}

async function updateStatus(type, id, status) {
    try {
        const res = await fetch(`${API}/admin/items/${type}/${id}/status`, {
            method: 'PUT', headers: headers(), body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Item ${status}!`, 'success');
            addLog(`Item ${status}: ${type} item ID ${id}`);
            addNotification('success', `Item was ${status} successfully.`);
            loadAllItems();
        } else showToast(data.message, 'error');
    } catch (e) { showToast('Error updating status', 'error'); }
}

async function deleteItem(type, id) {
    if (!confirm('Delete this item permanently?')) return;
    try {
        const res = await fetch(`${API}/admin/items/${type}/${id}`, { method: 'DELETE', headers: headers() });
        const data = await res.json();
        if (data.success) { showToast('Item deleted.', 'success'); addLog(`Deleted ${type} item ID ${id}`); loadAllItems(); }
        else showToast(data.message, 'error');
    } catch (e) { showToast('Error deleting item', 'error'); }
}

function openEditModal(type, id, name, category, desc, status, note) {
    document.getElementById('editItemId').value = id;
    document.getElementById('editItemType').value = type;
    document.getElementById('editItemName').value = name;
    document.getElementById('editItemCategory').value = category;
    document.getElementById('editItemDesc').value = desc;
    document.getElementById('editItemStatus').value = status;
    document.getElementById('editAdminNote').value = note;
    openModal('editModal');
}

document.getElementById('editItemForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const type = document.getElementById('editItemType').value;
    const body = {
        itemName: document.getElementById('editItemName').value,
        category: document.getElementById('editItemCategory').value,
        description: document.getElementById('editItemDesc').value,
        status: document.getElementById('editItemStatus').value,
        adminNote: document.getElementById('editAdminNote').value
    };
    try {
        const res = await fetch(`${API}/admin/items/${type}/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
        const data = await res.json();
        if (data.success) { showToast('Item updated!', 'success'); addLog(`Edited ${type} item: ${body.itemName}`); closeModal('editModal'); loadAllItems(); }
        else showToast(data.message, 'error');
    } catch (e) { showToast('Error updating item', 'error'); }
});

// =============================================
// LOST ITEMS
// =============================================
async function loadLostItems() {
    const tbody = document.getElementById('lostItemsTable');
    tbody.innerHTML = loadingRow(8);
    try {
        const res = await fetch(`${API}/admin/items?type=lost`, { headers: headers() });
        const data = await res.json();
        tbody.innerHTML = data.lost && data.lost.length
            ? data.lost.map(item => {
                const imgHtml = item.image
                    ? `<img src="${item.image}" class="item-thumb" alt="${item.itemName}" />`
                    : `<div class="item-thumb-ph">${catEmoji(item.category)}</div>`;
                return `<tr>
            <td>${imgHtml}</td>
            <td><strong>${escHtml(item.itemName)}</strong></td>
            <td>${item.category}</td>
            <td style="font-size:0.8rem;">${escHtml(item.locationLost)}</td>
            <td style="font-size:0.8rem;">${escHtml(item.reporter?.name || '–')}<br/><span style="color:var(--muted);font-size:0.75rem;">${escHtml(item.reporter?.email || '')}</span></td>
            <td style="font-size:0.8rem;">${fmtDate(item.dateLost)}</td>
            <td><span class="badge-status bs-${item.status}">${item.status}</span></td>
            <td style="white-space:nowrap;">
              ${item.status === 'pending' ? `<button class="btn-sm-action btn-approve" onclick="updateStatus('lost','${item._id}','approved')"><i class="bi bi-check"></i> Approve</button>
              <button class="btn-sm-action btn-reject" onclick="updateStatus('lost','${item._id}','rejected')"><i class="bi bi-x"></i> Reject</button>` : ''}
              <button class="btn-sm-action btn-delete" onclick="deleteItem('lost','${item._id}')"><i class="bi bi-trash"></i></button>
            </td>
          </tr>`;
            }).join('')
            : '<tr><td colspan="8" class="empty-state"><i class="bi bi-inbox"></i> No lost items yet</td></tr>';
    } catch (e) { tbody.innerHTML = errorRow(8); }
}

// =============================================
// REPORTERS
// =============================================
async function loadReporters() {
    try {
        const res = await fetch(`${API}/admin/reporters`, { headers: headers() });
        const data = await res.json();
        document.getElementById('lostReportersTable').innerHTML = data.lostReporters?.length
            ? data.lostReporters.map(r => `<tr><td>${escHtml(r.name)}</td><td style="font-size:0.8rem;">${escHtml(r.email)}</td><td style="font-size:0.8rem;">${escHtml(r.phone || '–')}</td><td><strong>${r.count}</strong></td></tr>`).join('')
            : '<tr><td colspan="4" class="empty-state" style="padding:1rem;"><i class="bi bi-inbox"></i> None</td></tr>';
        document.getElementById('foundReportersTable').innerHTML = data.foundReporters?.length
            ? data.foundReporters.map(r => `<tr><td>${escHtml(r.name)}</td><td style="font-size:0.8rem;">${escHtml(r.email)}</td><td style="font-size:0.8rem;">${escHtml(r.phone || '–')}</td><td><strong>${r.count}</strong></td></tr>`).join('')
            : '<tr><td colspan="4" class="empty-state" style="padding:1rem;"><i class="bi bi-inbox"></i> None</td></tr>';
    } catch (e) { console.error(e); }
}

// =============================================
// CLAIMS
// =============================================
async function loadClaims() {
    const tbody = document.getElementById('claimsTable');
    tbody.innerHTML = loadingRow(7);
    try {
        const status = document.getElementById('filterClaimStatus').value;
        let url = `${API}/admin/claims`;
        if (status) url += `?status=${status}`;
        const res = await fetch(url, { headers: headers() });
        const data = await res.json();
        tbody.innerHTML = data.claims?.length
            ? data.claims.map(c => `<tr>
          <td><strong>${escHtml(c.itemName)}</strong></td>
          <td><span class="badge-status ${c.itemType === 'lost' ? 'bs-pending' : 'bs-approved'}">${c.itemType}</span></td>
          <td>${escHtml(c.claimant?.name || '–')}</td>
          <td style="font-size:0.8rem;">${escHtml(c.claimant?.email || '–')}<br/>${escHtml(c.claimant?.phone || '')}</td>
          <td style="font-size:0.8rem;">${fmtDate(c.createdAt)}</td>
          <td><span class="badge-status bs-${c.status}">${c.status}</span></td>
          <td style="white-space:nowrap;">
            <button class="btn-sm-action btn-view" onclick="reviewClaim('${c._id}','${escAttr(c.itemName)}','${escAttr(c.description)}','${c.proof || ''}','${c.status}')"><i class="bi bi-eye"></i> Review</button>
            ${c.status === 'pending' ? `
            <button class="btn-sm-action btn-approve" onclick="updateClaimStatus('${c._id}','approved')"><i class="bi bi-check"></i></button>
            <button class="btn-sm-action btn-reject" onclick="updateClaimStatus('${c._id}','rejected')"><i class="bi bi-x"></i></button>` : ''}
          </td>
        </tr>`).join('')
            : '<tr><td colspan="7" class="empty-state"><i class="bi bi-inbox"></i> No claims found</td></tr>';
    } catch (e) { tbody.innerHTML = errorRow(7); }
}

function reviewClaim(id, name, desc, proof, status) {
    const body = document.getElementById('claimModalBody');
    body.innerHTML = `
    <p><strong>Item:</strong> ${escHtml(name)}</p>
    <p><strong>Description:</strong></p>
    <div style="background:#f8fafc;border-radius:8px;padding:1rem;margin-bottom:1rem;font-size:0.875rem;">${escHtml(desc)}</div>
    ${proof ? `<p><strong>Proof Image:</strong></p><img src="${proof}" style="width:100%;border-radius:10px;margin-bottom:1rem;" alt="proof" />` : '<p style="color:var(--muted);">No proof image uploaded.</p>'}
    <p><strong>Current Status:</strong> <span class="badge-status bs-${status}">${status}</span></p>
    ${status === 'pending' ? `
    <div style="display:flex;gap:0.75rem;margin-top:1rem;">
      <button class="btn-primary-sm" style="flex:1;background:linear-gradient(135deg,#10b981,#059669);justify-content:center;" onclick="updateClaimStatus('${id}','approved');closeModal('claimModal')"><i class="bi bi-check"></i> Approve Claim</button>
      <button class="btn-primary-sm" style="flex:1;background:linear-gradient(135deg,#ef4444,#dc2626);justify-content:center;" onclick="updateClaimStatus('${id}','rejected');closeModal('claimModal')"><i class="bi bi-x"></i> Reject Claim</button>
    </div>`: ''}`;
    openModal('claimModal');
}

async function updateClaimStatus(id, status) {
    try {
        const res = await fetch(`${API}/admin/claims/${id}/status`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status }) });
        const data = await res.json();
        if (data.success) { showToast(`Claim ${status}!`, 'success'); addLog(`Claim ${status}: ID ${id}`); addNotification('success', `A claim was ${status}.`); loadClaims(); }
        else showToast(data.message, 'error');
    } catch (e) { showToast('Error', 'error'); }
}

// =============================================
// CLAIMED ITEMS
// =============================================
async function loadClaimedItems() {
    const tbody = document.getElementById('claimedItemsTable');
    tbody.innerHTML = loadingRow(6);
    try {
        const res = await fetch(`${API}/admin/claims?status=approved`, { headers: headers() });
        const data = await res.json();
        tbody.innerHTML = data.claims?.length
            ? data.claims.map(c => `<tr>
          <td><strong>${escHtml(c.itemName)}</strong></td>
          <td><span class="badge-status ${c.itemType === 'lost' ? 'bs-pending' : 'bs-approved'}">${c.itemType}</span></td>
          <td>${escHtml(c.claimant?.name || '–')}</td>
          <td style="font-size:0.8rem;">${escHtml(c.claimant?.email || '–')}</td>
          <td style="font-size:0.8rem;">${fmtDate(c.updatedAt)}</td>
          <td>${c.proof ? `<a href="${c.proof}" target="_blank" style="color:var(--primary);">View Proof</a>` : '–'}</td>
        </tr>`).join('')
            : '<tr><td colspan="6" class="empty-state"><i class="bi bi-inbox"></i> No claimed items yet</td></tr>';
    } catch (e) { tbody.innerHTML = errorRow(6); }
}

// =============================================
// USERS
// =============================================
async function loadUsers() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = loadingRow(6);
    try {
        const res = await fetch(`${API}/admin/users`, { headers: headers() });
        const data = await res.json();
        tbody.innerHTML = data.users?.length
            ? data.users.map(u => `<tr>
          <td><strong>${escHtml(u.name)}</strong></td>
          <td style="font-size:0.8rem;">${escHtml(u.email)}</td>
          <td><span class="badge-status bs-approved">${u.role}</span></td>
          <td style="font-size:0.8rem;">${fmtDate(u.createdAt)}</td>
          <td>${u.isBlocked ? '<span class="badge-status bs-rejected">Blocked</span>' : '<span class="badge-status bs-approved">Active</span>'}</td>
          <td style="white-space:nowrap;">
            <button class="btn-sm-action btn-block" onclick="toggleBlock('${u._id}','${u.isBlocked}')">${u.isBlocked ? '<i class="bi bi-unlock"></i> Unblock' : '<i class="bi bi-lock"></i> Block'}</button>
            <button class="btn-sm-action btn-delete" onclick="deleteUser('${u._id}')"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`).join('')
            : '<tr><td colspan="6" class="empty-state"><i class="bi bi-people"></i> No users found</td></tr>';
    } catch (e) { tbody.innerHTML = errorRow(6); }
}

async function toggleBlock(id, isBlocked) {
    try {
        const res = await fetch(`${API}/admin/users/${id}/block`, { method: 'PUT', headers: headers() });
        const data = await res.json();
        if (data.success) { showToast(data.message, 'success'); addLog(`User ${data.user.isBlocked ? 'blocked' : 'unblocked'}: ${data.user.email}`); loadUsers(); }
        else showToast(data.message, 'error');
    } catch (e) { showToast('Error', 'error'); }
}

async function deleteUser(id) {
    if (!confirm('Delete this user permanently?')) return;
    try {
        const res = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: headers() });
        const data = await res.json();
        if (data.success) { showToast('User deleted.', 'success'); addLog(`Deleted user ID ${id}`); loadUsers(); }
        else showToast(data.message, 'error');
    } catch (e) { showToast('Error', 'error'); }
}

// =============================================
// NOTIFICATIONS
// =============================================
function addNotification(type, msg) {
    const n = { id: Date.now(), type, msg, time: new Date().toISOString(), read: false };
    notifications.unshift(n);
    if (notifications.length > 50) notifications = notifications.slice(0, 50);
    localStorage.setItem('adminNotifications', JSON.stringify(notifications));
    document.getElementById('notifDot').style.display = 'block';
}

function renderNotifications() {
    document.getElementById('notifDot').style.display = 'none';
    notifications.forEach(n => n.read = true);
    localStorage.setItem('adminNotifications', JSON.stringify(notifications));
    const icons = { success: 'bi-check-circle', error: 'bi-x-circle', info: 'bi-info-circle', warning: 'bi-exclamation-triangle' };
    const colors = { success: '#d1fae5', error: '#fee2e2', info: '#ede9fe', warning: '#fef3c7' };
    const list = document.getElementById('notificationsList');
    if (!notifications.length) { list.innerHTML = '<div class="empty-state"><i class="bi bi-bell-slash"></i><h5>No notifications</h5></div>'; return; }
    list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-icon" style="background:${colors[n.type] || '#ede9fe'};"><i class="bi ${icons[n.type] || 'bi-bell'}" style="color:var(--primary);"></i></div>
      <div>
        <div style="font-size:0.875rem;">${escHtml(n.msg)}</div>
        <div style="font-size:0.75rem;color:var(--muted);">${fmtDate(n.time)}</div>
      </div>
    </div>`).join('');
}

// =============================================
// SYSTEM LOGS
// =============================================
function addLog(action) {
    const log = { action, time: new Date().toISOString(), admin: adminUser.name || 'Admin' };
    systemLogs.unshift(log);
    if (systemLogs.length > 100) systemLogs = systemLogs.slice(0, 100);
    localStorage.setItem('systemLogs', JSON.stringify(systemLogs));
}

function renderLogs() {
    const list = document.getElementById('logsList');
    if (!systemLogs.length) { list.innerHTML = '<div class="empty-state"><i class="bi bi-journal-x"></i><h5>No logs yet</h5></div>'; return; }
    list.innerHTML = `<table class="data-table">
    <thead><tr><th>Action</th><th>Admin</th><th>Timestamp</th></tr></thead>
    <tbody>${systemLogs.map(l => `<tr>
      <td><i class="bi bi-terminal me-2 text-primary"></i>${escHtml(l.action)}</td>
      <td>${escHtml(l.admin)}</td>
      <td style="font-size:0.8rem;color:var(--muted);">${new Date(l.time).toLocaleString()}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// =============================================
// HELPERS
// =============================================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function showToast(msg, type = 'info') {
    const wrap = document.getElementById('toastWrap');
    const icons = { success: 'bi-check-circle', error: 'bi-x-circle', info: 'bi-info-circle' };
    const div = document.createElement('div');
    div.className = `toast-item ${type}`;
    div.innerHTML = `<i class="bi ${icons[type] || 'bi-info-circle'}"></i><span>${escHtml(msg)}</span>`;
    wrap.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; div.style.transform = 'translateX(100%)'; div.style.transition = 'all 0.3s'; setTimeout(() => div.remove(), 300); }, 3500);
}

function animateNum(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    let cur = 0; const step = Math.max(1, Math.ceil(val / 40));
    const t = setInterval(() => { cur = Math.min(cur + step, val); el.textContent = cur; if (cur >= val) clearInterval(t); }, 40);
}

function fmtDate(d) { if (!d) return '–'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function escHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = String(t); return d.innerHTML; }
function escAttr(t) { if (!t) return ''; return String(t).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function loadingRow(cols) { return `<tr><td colspan="${cols}" style="text-align:center;padding:2rem;"><div class="spinner" style="margin:0 auto;width:30px;height:30px;border-width:2px;"></div></td></tr>`; }
function errorRow(cols) { return `<tr><td colspan="${cols}" class="empty-state" style="color:var(--danger);">Error loading data.</td></tr>`; }
function catEmoji(c) { const m = { Electronics: '📱', Clothing: '👕', Books: '📚', Accessories: '⌚', Documents: '📄', Bags: '🎒', Keys: '🔑', Wallet: '👛', Jewelry: '💍', Sports: '🏆', Other: '📦' }; return m[c] || '📦'; }

function redirectIfUnauth(res) { if (res.status === 401) { localStorage.clear(); window.location.href = '/admin/login'; } }

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// Global search
document.getElementById('globalSearch').addEventListener('input', function () {
    const q = this.value.trim();
    if (q.length > 2) { navigateTo('manage-items'); }
});

// INIT
(async () => {
    await loadDashboard();
    addNotification('info', 'Welcome to the Admin Dashboard!');
})();
