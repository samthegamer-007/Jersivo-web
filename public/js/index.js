// public/js/index.js

// ── Team lists per category ──────────────────────────────────────────────
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

// ── State ────────────────────────────────────────────────────────────────
let allProducts = [];
let activeCategory = 'Club Jersey';
let activeTeam = '';

// ── Init ─────────────────────────────────────────────────────────────────
(async function init() {
  // Check maintenance mode
  try {
    const st = await fetch('/api/status').then(r => r.json());
    if (st.maintenance) {
      document.getElementById('maintenance-screen').style.display = 'flex';
      return;
    }
  } catch(e) {}

  updateCartBadge();
  await loadProducts();
  setupCategoryTabs();
  setupTeamSelect();
  renderProducts();
})();

// ── Load products ────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    allProducts = await fetch('/api/products').then(r => r.json());
  } catch(e) {
    document.getElementById('products-grid').innerHTML =
      '<p style="color:#666;text-align:center;padding:3rem">Failed to load products.</p>';
  }
}

// ── Category tabs ────────────────────────────────────────────────────────
function setupCategoryTabs() {
  document.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      activeTeam = '';
      populateTeamSelect();
      renderProducts();
    });
  });
}

// ── Team dropdown ─────────────────────────────────────────────────────────
function setupTeamSelect() {
  populateTeamSelect();
  document.getElementById('team-select').addEventListener('change', e => {
    activeTeam = e.target.value;
    renderProducts();
  });
}

function populateTeamSelect() {
  const sel = document.getElementById('team-select');
  const teams = TEAM_MAP[activeCategory] || ALL_TEAMS;
  sel.innerHTML = '<option value="">All Teams</option>' +
    teams.map(t => `<option value="${t}"${t===activeTeam?' selected':''}>${t}</option>`).join('');
}

// ── Render ────────────────────────────────────────────────────────────────
function renderProducts() {
  let filtered = allProducts.filter(p => p.category === activeCategory);
  if (activeTeam) filtered = filtered.filter(p => p.team === activeTeam);

  const grid = document.getElementById('products-grid');
  document.getElementById('products-count').textContent =
    `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    grid.innerHTML = '<p style="color:#555;text-align:center;padding:3rem;grid-column:1/-1">No jerseys found in this category.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => productCardHTML(p)).join('');

  // Flip on mobile tap
  grid.querySelectorAll('.card-image-wrap').forEach(wrap => {
    wrap.addEventListener('click', () => wrap.classList.toggle('flipped'));
  });

  // Add to cart
  grid.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sku = btn.dataset.sku;
      const sizeEl = document.getElementById(`size-${sku}`);
      const size = sizeEl?.value;
      if (!size) { showToast('Please select a size'); return; }
      const product = allProducts.find(p => p.sku === sku);
      if (!product) return;
      addToCart(product, size);
      showToast(`${product.name} (${size}) added to cart!`);
    });
  });
}

function productCardHTML(p) {
  const sizesOptions = (p.sizes || []).map(s =>
    `<option value="${s}">${s}</option>`
  ).join('');
  return `
<div class="product-card">
  <div class="card-image-wrap">
    <img class="card-img-primary" src="${p.image1}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/333?text=Jersey'"/>
    <img class="card-img-secondary" src="${p.image2}" alt="${p.name} back" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/1a1a1a/333?text=Jersey'"/>
  </div>
  <div class="card-body">
    <div class="card-name">${p.name}</div>
    <div class="card-price">₹${Number(p.price).toLocaleString('en-IN')}</div>
    <select class="size-select" id="size-${p.sku}">
      <option value="">Select Size</option>
      ${sizesOptions}
    </select>
    <button class="add-cart-btn" data-sku="${p.sku}">Add to Cart</button>
  </div>
</div>`;
}

// ── Cart ──────────────────────────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem('jersivo_cart') || '[]'); } catch { return []; }
}
function saveCart(cart) { localStorage.setItem('jersivo_cart', JSON.stringify(cart)); }

function addToCart(product, size) {
  const cart = getCart();
  const key = `${product.sku}-${size}`;
  const existing = cart.find(i => i.key === key);
  if (existing) { existing.qty++; }
  else {
    cart.push({
      key, sku: product.sku, name: product.name, price: product.price,
      image1: product.image1, size, qty: 1
    });
  }
  saveCart(cart);
  updateCartBadge();
}

function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  badge.textContent = total;
  badge.classList.toggle('hidden', total === 0);
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
