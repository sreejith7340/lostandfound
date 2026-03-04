// =============================================
// SEARCH PAGE JavaScript
// =============================================

const categoryIcons = {
    Electronics: 'bi-phone', Clothing: 'bi-person-bounding-box', Books: 'bi-book',
    Accessories: 'bi-watch', Documents: 'bi-file-earmark', Bags: 'bi-bag',
    Keys: 'bi-key', Wallet: 'bi-credit-card', Jewelry: 'bi-gem',
    Sports: 'bi-trophy', Other: 'bi-three-dots'
};

let currentType = 'all';
let currentCategory = 'all';
let currentSort = 'newest';
let isGridView = true;

// Read URL params on load
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('type')) currentType = urlParams.get('type');
if (urlParams.get('category')) {
    currentCategory = urlParams.get('category');
    const radio = document.querySelector(`input[value="${currentCategory}"]`);
    if (radio) radio.checked = true;
}
if (urlParams.get('q')) document.getElementById('searchInput').value = urlParams.get('q');

// Set active type chip
document.querySelectorAll('[data-type]').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.type === currentType);
    chip.addEventListener('click', () => {
        currentType = chip.dataset.type;
        document.querySelectorAll('[data-type]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        doSearch();
    });
});

// Category filter change
document.getElementById('categoryFilters').addEventListener('change', (e) => {
    currentCategory = e.target.value;
});

document.getElementById('sortBy').addEventListener('change', (e) => {
    currentSort = e.target.value;
});

document.getElementById('applyFilters').addEventListener('click', doSearch);
document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.querySelector('input[value="all"]').checked = true;
    currentCategory = 'all';
    currentType = 'all';
    currentSort = 'newest';
    document.getElementById('sortBy').value = 'newest';
    document.querySelectorAll('[data-type]').forEach(c => c.classList.toggle('active', c.dataset.type === 'all'));
    doSearch();
});

document.getElementById('searchBtn').addEventListener('click', doSearch);
document.getElementById('searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

document.getElementById('viewGrid').addEventListener('click', () => { isGridView = true; renderResults(lastResults); });
document.getElementById('viewList').addEventListener('click', () => { isGridView = false; renderResults(lastResults); });

let lastResults = { lost: [], found: [] };

async function doSearch() {
    const q = document.getElementById('searchInput').value.trim();
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '<div class="col-12 loading-spinner"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (currentCategory !== 'all') params.set('category', currentCategory);
        if (currentType !== 'all') params.set('type', currentType);

        const res = await fetch(`/api/items/search?${params}`);
        const data = await res.json();

        if (data.success) {
            lastResults = data;
            renderResults(data);
        } else {
            container.innerHTML = '<div class="col-12 empty-state"><i class="bi bi-exclamation-circle"></i><h5>Failed to load items</h5></div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="col-12 empty-state"><i class="bi bi-wifi-off"></i><h5>Network error</h5></div>';
    }
}

function renderResults(data) {
    const container = document.getElementById('itemsContainer');
    let allItems = [];

    if (currentType === 'all' || currentType === 'lost') {
        data.lost.forEach(item => allItems.push({ ...item, _itemType: 'lost' }));
    }
    if (currentType === 'all' || currentType === 'found') {
        data.found.forEach(item => allItems.push({ ...item, _itemType: 'found' }));
    }

    // Sort
    allItems.sort((a, b) => {
        const da = new Date(a.createdAt), db = new Date(b.createdAt);
        return currentSort === 'newest' ? db - da : da - db;
    });

    document.getElementById('resultsCount').textContent = `${allItems.length} item${allItems.length !== 1 ? 's' : ''} found`;

    if (!allItems.length) {
        container.innerHTML = '<div class="col-12 empty-state"><i class="bi bi-search"></i><h5>No items found</h5><p class="text-muted">Try adjusting your search or filters.</p></div>';
        return;
    }

    if (isGridView) {
        container.innerHTML = allItems.map(item => renderCard(item)).join('');
    } else {
        container.innerHTML = `<div class="col-12">${allItems.map(item => renderListItem(item)).join('')}</div>`;
    }
}

function renderCard(item) {
    const isLost = item._itemType === 'lost';
    const date = isLost ? item.dateLost : item.dateFound;
    const location = isLost ? item.locationLost : item.locationFound;
    const icon = categoryIcons[item.category] || 'bi-box';
    const imgHtml = item.image
        ? `<img src="${item.image}" class="item-card-img" alt="${item.itemName}" />`
        : `<div class="item-card-img-placeholder"><i class="bi ${icon}"></i></div>`;

    return `
    <div class="col-sm-6 col-xl-4">
      <div class="item-card" onclick="openItemModal('${item._id}','${item._itemType}')" style="cursor:pointer;">
        ${imgHtml}
        <div class="item-card-body">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="item-badge ${isLost ? 'badge-lost' : 'badge-found'}">
              <i class="bi ${isLost ? 'bi-exclamation-circle' : 'bi-check-circle'}"></i>
              ${isLost ? 'Lost' : 'Found'}
            </span>
            <span class="category-tag">${item.category}</span>
          </div>
          <h6 class="fw-700 mb-1" style="font-size:0.95rem;">${escHtml(item.itemName)}</h6>
          <p class="text-muted mb-2" style="font-size:0.82rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            ${escHtml(item.description)}
          </p>
          <div style="font-size:0.78rem;color:var(--text-muted);display:flex;flex-direction:column;gap:3px;">
            <div><i class="bi bi-geo-alt me-1 text-primary"></i>${escHtml(location)}</div>
            <div><i class="bi bi-calendar me-1 text-primary"></i>${fmtDate(date)}</div>
          </div>
          <button class="btn btn-primary w-100 mt-3" style="font-size:0.8rem;padding:0.45rem;"
            onclick="event.stopPropagation();openClaimModal('${item._id}','${item._itemType}','${escAttr(item.itemName)}')">
            <i class="bi bi-hand-thumbs-up me-1"></i>Claim This Item
          </button>
        </div>
      </div>
    </div>`;
}

function renderListItem(item) {
    const isLost = item._itemType === 'lost';
    const date = isLost ? item.dateLost : item.dateFound;
    const location = isLost ? item.locationLost : item.locationFound;
    const icon = categoryIcons[item.category] || 'bi-box';
    const imgHtml = item.image
        ? `<img src="${item.image}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;" alt="${item.itemName}" />`
        : `<div style="width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,#ede9fe,#ddd6fe);display:flex;align-items:center;justify-content:center;font-size:1.5rem;"><i class="bi ${icon} text-primary"></i></div>`;

    return `
    <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:1rem;cursor:pointer;transition:all 0.2s;"
      onmouseover="this.style.boxShadow='0 4px 15px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow=''"
      onclick="openItemModal('${item._id}','${item._itemType}')">
      ${imgHtml}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span class="item-badge ${isLost ? 'badge-lost' : 'badge-found'}">${isLost ? 'Lost' : 'Found'}</span>
          <span class="category-tag">${item.category}</span>
        </div>
        <div style="font-weight:700;font-size:0.95rem;">${escHtml(item.itemName)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);">
          <i class="bi bi-geo-alt me-1"></i>${escHtml(location)} &nbsp;|&nbsp; <i class="bi bi-calendar me-1"></i>${fmtDate(date)}
        </div>
      </div>
      <button class="btn btn-primary" style="font-size:0.8rem;padding:0.45rem 0.875rem;white-space:nowrap;"
        onclick="event.stopPropagation();openClaimModal('${item._id}','${item._itemType}','${escAttr(item.itemName)}')">
        <i class="bi bi-hand-thumbs-up me-1"></i>Claim
      </button>
    </div>`;
}

// Open item detail modal
async function openItemModal(id, type) {
    const modalEl = document.getElementById('itemModal');
    const body = document.getElementById('itemModalBody');
    document.getElementById('itemModalLabel').textContent = 'Loading…';
    body.innerHTML = '<div class="text-center py-4"><div class="spinner" style="margin:auto;"></div></div>';
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    try {
        const res = await fetch(`/api/items/${type}/${id}`);
        const data = await res.json();
        if (!data.success) { body.innerHTML = '<p class="text-danger">Failed to load item.</p>'; return; }
        const item = data.item;
        const isLost = type === 'lost';
        const date = isLost ? item.dateLost : item.dateFound;
        const location = isLost ? item.locationLost : item.locationFound;
        const contact = isLost ? item.reporter : item.finder;

        document.getElementById('itemModalLabel').textContent = item.itemName;
        body.innerHTML = `
      ${item.image ? `<img src="${item.image}" class="item-detail-modal" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;margin-bottom:1rem;" alt="${item.itemName}" />` : ''}
      <div class="d-flex gap-2 mb-3">
        <span class="item-badge ${isLost ? 'badge-lost' : 'badge-found'}">${isLost ? '🔴 Lost' : '🟢 Found'}</span>
        <span class="category-tag">${item.category}</span>
      </div>
      <h5 class="fw-700 mb-2">${escHtml(item.itemName)}</h5>
      <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.7;">${escHtml(item.description)}</p>
      <div class="meta-row">
        <div class="meta-item"><i class="bi bi-geo-alt text-primary"></i><span>${escHtml(location)}</span></div>
        <div class="meta-item"><i class="bi bi-calendar text-primary"></i><span>${fmtDate(date)}</span></div>
      </div>
      <hr />
      <h6 class="fw-700 mb-2">Contact Information</h6>
      <p style="font-size:0.875rem;color:var(--text-muted);">
        <i class="bi bi-person me-2"></i>${escHtml(contact?.name || '–')}<br/>
        <i class="bi bi-envelope me-2"></i>${escHtml(contact?.email || '–')}<br/>
        ${contact?.phone ? `<i class="bi bi-telephone me-2"></i>${escHtml(contact.phone)}` : ''}
      </p>
      ${item.status !== 'claimed' ? `
      <button class="btn btn-primary w-100 mt-3" onclick="openClaimModal('${item._id}','${type}','${escAttr(item.itemName)}')">
        <i class="bi bi-hand-thumbs-up me-2"></i>Submit Claim Request
      </button>` : '<div class="alert alert-success m-0 mt-3">✅ This item has already been claimed.</div>'}`;
    } catch (e) {
        body.innerHTML = '<p class="text-danger">Network error.</p>';
    }
}

// Claim modal
function openClaimModal(itemId, itemType, itemName) {
    document.getElementById('claimItemId').value = itemId;
    document.getElementById('claimItemType').value = itemType;
    document.getElementById('claimItemName').value = itemName;
    const bsModal = document.getElementById('itemModal');
    if (bsModal._bsModal) bootstrap.Modal.getInstance(bsModal)?.hide();
    new bootstrap.Modal(document.getElementById('claimModal')).show();
}

// Claim form
document.getElementById('claimForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting…';
    try {
        const fd = new FormData(this);
        const res = await fetch('/api/items/claim', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('claimModal')).hide();
            showToast('Claim submitted! Admin will review it.', 'success');
            this.reset();
        } else {
            showToast(data.message || 'Failed to submit claim.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send me-2"></i>Submit Claim';
});

// TOAST
function showToast(msg, type = 'info') {
    const el = document.getElementById('toastMsg');
    el.className = `toast custom-toast align-items-center text-white border-0 bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary'}`;
    document.getElementById('toastBody').textContent = msg;
    new bootstrap.Toast(el, { delay: 4000 }).show();
}

// HELPERS
function fmtDate(d) { if (!d) return '–'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function escHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function escAttr(t) { if (!t) return ''; return t.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// Initial load
doSearch();
