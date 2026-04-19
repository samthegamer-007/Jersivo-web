// public/js/admin.js

const CLUB_TEAMS = [
  'Manchester City','Manchester United','Barcelona','Real Madrid','Atletico Madrid',
  'Inter Milan','AC Milan','Dortmund','Bayern Munich','Juventus',
  'PSG','Liverpool','Arsenal','Chelsea','Inter Miami'
];
const NATIONAL_TEAMS = ['Germany','Spain','Argentina','Portugal','Brazil','England','France'];
const ALL_TEAMS = [...CLUB_TEAMS, ...NATIONAL_TEAMS];

const TEAM_MAP = {
  'Club Jersey': CLUB_TEAMS,
  'Retro Club Jersey': CLUB_TEAMS,
  'National Team Jersey': NATIONAL_TEAMS,
  'Retro National Team Jersey': NATIONAL_TEAMS,
  'Special Edition Jersey': ALL_TEAMS,
};

const CATEGORY_PREFIX = {
  'Club Jersey':'CJ','Retro Club Jersey':'CR','National Team Jersey':'NT',
  'Retro National Team Jersey':'NR','Special Edition Jersey':'SE',
};
const TEAM_CODE = {
  'Manchester City':'MCT','Manchester United':'MUN','Barcelona':'FCB',
  'Real Madrid':'RMA','Atletico Madrid':'ATM','Inter Milan':'ITM',
  'AC Milan':'ACM','Dortmund':'DOR','Bayern Munich':'BAY','Juventus':'JVT',
  'PSG':'PSG','Liverpool':'LVP','Arsenal':'ARS','Chelsea':'CLS',
  'Inter Miami':'IMI','Germany':'GER','Spain':'SPN','Argentina':'ARG',
  'Portugal':'PTG','Brazil':'BRA','England':'ENG','France':'FRA',
};

let allProducts = [];
let editingSku = null;

// ── Auth check ────────────────────────────────────────────────────────────
(async function init() {
  const r = await fetch('/api/admin/session').then(res => res.json()).catch(() => ({}));
  if (!r.isAdmin) { location.href = '/admin-login.html'; return; }

  setupTabs();
  setupLogout();
  setupKillSwitch();
  setupCategoryChange();
  await loadAndRenderProducts();

  document.getElementById('submit-btn').addEventListener('click', handleSubmit);
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);

  // Live filter
  ['search-input','filter-cat','filter-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderProductList);
    document.getElementById(id).addEventListener('change', renderProductList);
  });
})();

// ── Tabs ──────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'view') loadAndRenderProducts();
    });
  });
}

// ── Logout ────────────────────────────────────────────────────────────────
function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    location.href = '/admin-login.html';
  });
}

// ── Kill Switch ───────────────────────────────────────────────────────────
async function setupKillSwitch() {
  const toggle = document.getElementById('ks-toggle');
  const statusText = document.getElementById('ks-status-text');

  const r = await fetch('/api/admin/killswitch').then(res => res.json()).catch(() => ({ enabled: false }));
  toggle.checked = r.enabled;
  updateKsText(r.enabled);

  toggle.addEventListener('change', async () => {
    const res = await fetch('/api/admin/killswitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: toggle.checked })
    }).then(r => r.json());
    updateKsText(res.enabled);
  });

  function updateKsText(on) {
    statusText.textContent = on ? 'MAINTENANCE MODE ON' : 'LIVE';
    statusText.style.color = on ? '#e55' : '#04FBFF';
  }
}

// ── Category → Team dependency ────────────────────────────────────────────
function setupCategoryChange() {
  document.getElementById('f-category').addEventListener('change', () => {
    populateTeamDropdown();
    updateSkuPreview();
  });
  document.getElementById('f-team').addEventListener('change', updateSkuPreview);
}

function populateTeamDropdown(selectedTeam = '') {
  const cat = document.getElementById('f-category').value;
  const sel = document.getElementById('f-team');
  const teams = TEAM_MAP[cat] || [];
  sel.disabled = !cat;
  sel.innerHTML = `<option value="">${cat ? 'Select team' : 'Select category first'}</option>` +
    teams.map(t => `<option value="${t}"${t===selectedTeam?' selected':''}>${t}</option>`).join('');
}

function updateSkuPreview() {
  const cat = document.getElementById('f-category').value;
  const team = document.getElementById('f-team').value;
  const prefix = CATEGORY_PREFIX[cat] || 'XX';
  const code = TEAM_CODE[team] || 'XXX';
  document.getElementById('sku-preview').textContent =
    (cat && team) ? `${prefix}-???-${code}  (auto-generated)` : '—';
}

// ── Load Products ─────────────────────────────────────────────────────────
async function loadAndRenderProducts() {
  try {
    allProducts = await fetch('/api/admin/products').then(r => r.json());
  } catch(e) {
    allProducts = [];
  }
  renderProductList();
}

function renderProductList() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const catFilter = document.getElementById('filter-cat').value;
  const statusFilter = document.getElementById('filter-status').value;

  let list = allProducts.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search) ||
      p.sku.toLowerCase().includes(search);
    const matchCat = !catFilter || p.category === catFilter;
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const container = document.getElementById('products-list');
  if (!list.length) {
    container.innerHTML = '<p class="msg">No products found.</p>';
    return;
  }

  container.innerHTML = list.map(p => productRowHTML(p)).join('');

  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.dataset.sku));
  });
  container.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.sku));
  });
}

function productRowHTML(p) {
  const isDeleted = p.status === 'DELETED';
  return `
<div class="product-row${isDeleted?' deleted':''}">
  <img class="prod-img" src="${p.image1}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/52x66/111/333?text=J'"/>
  <div class="prod-info">
    <div class="prod-name">${p.name}</div>
    <div class="prod-meta">${p.category} · ${p.team} · ₹${Number(p.price).toLocaleString('en-IN')} · Sizes: ${(p.sizes||[]).join(', ')}</div>
    <div class="prod-sku">${p.sku} <span class="badge ${isDeleted?'badge-deleted':'badge-live'}">${p.status}</span></div>
  </div>
  <div class="prod-actions">
    <button class="edit-btn" data-sku="${p.sku}" ${isDeleted?'disabled':''}>Edit</button>
    <button class="del-btn" data-sku="${p.sku}" ${isDeleted?'disabled':''}>Delete</button>
  </div>
</div>`;
}

// ── Add / Edit Product ────────────────────────────────────────────────────
async function handleSubmit() {
  const name = document.getElementById('f-name').value.trim();
  const category = document.getElementById('f-category').value;
  const team = document.getElementById('f-team').value;
  const price = parseFloat(document.getElementById('f-price').value);
  const image1 = document.getElementById('f-image1').value.trim();
  const image2 = document.getElementById('f-image2').value.trim();
  const sizesEl = document.getElementById('f-sizes');
  const sizes = Array.from(sizesEl.selectedOptions).map(o => o.value);
  const msgEl = document.getElementById('form-msg');

  if (!name || !category || !team || !price || !image1 || !image2 || !sizes.length) {
    msgEl.className = 'msg error'; msgEl.textContent = 'Please fill in all fields and select at least one size.';
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = editingSku ? 'Saving...' : 'Adding...';
  msgEl.className = 'msg'; msgEl.textContent = '';

  try {
    const body = { name, category, team, price, image1, image2, sizes };
    const url = editingSku ? `/api/admin/products/${editingSku}` : '/api/admin/products';
    const method = editingSku ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    msgEl.className = 'msg success';
    msgEl.textContent = editingSku ? `Product updated! SKU: ${data.sku}` : `Product added! SKU: ${data.sku}`;
    resetForm();
    await loadAndRenderProducts();
  } catch(err) {
    msgEl.className = 'msg error'; msgEl.textContent = err.message || 'Error saving product.';
  } finally {
    btn.disabled = false;
    btn.textContent = editingSku ? 'Save Changes' : 'Add Product';
  }
}

function startEdit(sku) {
  const p = allProducts.find(x => x.sku === sku);
  if (!p) return;
  editingSku = sku;

  // Switch to add tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p2 => p2.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="add"]').classList.add('active');
  document.getElementById('panel-add').classList.add('active');

  document.getElementById('form-title').textContent = `Edit Product: ${sku}`;
  document.getElementById('f-name').value = p.name;
  document.getElementById('f-category').value = p.category;
  populateTeamDropdown(p.team);
  document.getElementById('f-price').value = p.price;
  document.getElementById('f-image1').value = p.image1;
  document.getElementById('f-image2').value = p.image2;

  // Set sizes
  const sizesEl = document.getElementById('f-sizes');
  Array.from(sizesEl.options).forEach(o => { o.selected = (p.sizes||[]).includes(o.value); });

  document.getElementById('sku-preview').textContent = sku + ' (immutable)';
  document.getElementById('submit-btn').textContent = 'Save Changes';
  document.getElementById('cancel-edit-btn').style.display = 'inline-block';
  document.getElementById('form-msg').textContent = '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  editingSku = null;
  resetForm();
}

function resetForm() {
  editingSku = null;
  document.getElementById('form-title').textContent = 'Add Product';
  document.getElementById('f-name').value = '';
  document.getElementById('f-category').value = '';
  document.getElementById('f-team').value = ''; populateTeamDropdown();
  document.getElementById('f-price').value = '';
  document.getElementById('f-image1').value = '';
  document.getElementById('f-image2').value = '';
  Array.from(document.getElementById('f-sizes').options).forEach(o => o.selected = false);
  document.getElementById('sku-preview').textContent = '—';
  document.getElementById('submit-btn').textContent = 'Add Product';
  document.getElementById('cancel-edit-btn').style.display = 'none';
}

// ── Delete ────────────────────────────────────────────────────────────────
async function handleDelete(sku) {
  if (!confirm(`Delete product ${sku}? It will be hidden from the website but kept in the sheet.`)) return;
  try {
    const res = await fetch(`/api/admin/products/${sku}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    await loadAndRenderProducts();
  } catch(e) {
    alert('Failed to delete product: ' + e.message);
  }
}
