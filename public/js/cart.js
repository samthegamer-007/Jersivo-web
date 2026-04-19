// public/js/cart.js

// ── Shipping config ────────────────────────────────────────────────────
const SHIPPING = {
  'india_post': { label: 'India Post Speed Post', desc: 'Fastest & cheapest – Prepaid only', cod: false, feeUnder: 45, feeFree: 0 },
  'delhivery_prepaid': { label: 'Delhivery Prepaid', desc: 'Reliable courier – Prepaid', cod: false, feeUnder: 55, feeFree: 0 },
  'delhivery_cod': { label: 'Delhivery COD', desc: 'Cash on Delivery – fee paid online', cod: true, feeUnder: 75, feeFree: 0 },
};
const FREE_THRESHOLD = 1199;

let selectedShipping = 'india_post';

// ── Init ─────────────────────────────────────────────────────────────────
(async function init() {
  try {
    const st = await fetch('/api/status').then(r => r.json());
    if (st.maintenance) {
      document.getElementById('maintenance-screen').style.display = 'flex';
      return;
    }
  } catch(e) {}
  renderCart();
})();

// ── Cart helpers ──────────────────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem('jersivo_cart') || '[]'); } catch { return []; }
}
function saveCart(cart) { localStorage.setItem('jersivo_cart', JSON.stringify(cart)); }

// ── Shipping fee ──────────────────────────────────────────────────────────
function getShippingFee(method, subtotal) {
  const cfg = SHIPPING[method];
  if (!cfg) return 0;
  return subtotal >= FREE_THRESHOLD ? 0 : cfg.feeUnder;
}

// ── Render ────────────────────────────────────────────────────────────────
function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-content');

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <h3>Your cart is empty</h3>
        <p>Browse our jersey collection and add something you love.</p>
        <a href="/">Shop Now</a>
      </div>`;
    return;
  }

  const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const shippingFee = getShippingFee(selectedShipping, subtotal);
  const total = subtotal + shippingFee;

  container.innerHTML = `
    <div class="cart-items" id="cart-items">
      ${cart.map(item => cartItemHTML(item)).join('')}
    </div>
    <div class="checkout-box">
      <p class="section-label">Delivery Details</p>
      <div class="form-grid">
        <div class="form-field"><label>Full Name *</label><input type="text" id="f-name" placeholder="Your name"/></div>
        <div class="form-field"><label>Phone *</label><input type="tel" id="f-phone" placeholder="10-digit mobile"/></div>
        <div class="form-field full"><label>Email *</label><input type="email" id="f-email" placeholder="email@example.com"/></div>
        <div class="form-field full"><label>Address *</label><input type="text" id="f-address" placeholder="House/Flat no., Street, Area"/></div>
        <div class="form-field"><label>City *</label><input type="text" id="f-city" placeholder="City"/></div>
        <div class="form-field"><label>State *</label><input type="text" id="f-state" placeholder="State"/></div>
        <div class="form-field"><label>Pincode *</label><input type="text" id="f-pincode" placeholder="6-digit pincode"/></div>
      </div>

      <p class="section-label">Shipping Method</p>
      <div class="shipping-options" id="shipping-options">
        ${Object.entries(SHIPPING).map(([key, cfg]) => {
          const fee = getShippingFee(key, subtotal);
          const feeLabel = fee === 0 ? '<span style="color:#04FBFF">FREE</span>' : `₹${fee}`;
          return `
          <label class="shipping-opt">
            <input type="radio" name="shipping" value="${key}" ${key===selectedShipping?'checked':''}/>
            <div class="shipping-opt-info">
              <div class="shipping-opt-name">${cfg.label}${cfg.cod?' <span style="color:#f90;font-size:0.7rem">[COD]</span>':''}</div>
              <div class="shipping-opt-desc">${cfg.desc}</div>
            </div>
            <span class="shipping-opt-price">${feeLabel}</span>
          </label>`;
        }).join('')}
      </div>

      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
        <div class="total-row"><span>Shipping</span><span id="shipping-fee-display">${shippingFee === 0 ? 'FREE' : '₹'+shippingFee}</span></div>
        <div class="total-row grand"><span>Total</span><span id="total-display">₹${total.toLocaleString('en-IN')}</span></div>
      </div>

      <button class="proceed-btn" id="proceed-btn">Proceed to Instagram →</button>
    </div>`;

  // Qty buttons
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const delta = parseInt(btn.dataset.delta);
      const cart2 = getCart();
      const item = cart2.find(i => i.key === key);
      if (!item) return;
      item.qty = Math.max(1, item.qty + delta);
      saveCart(cart2);
      renderCart();
    });
  });

  // Remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const cart2 = getCart().filter(i => i.key !== key);
      saveCart(cart2);
      renderCart();
    });
  });

  // Shipping radio
  document.querySelectorAll('input[name="shipping"]').forEach(r => {
    r.addEventListener('change', e => {
      selectedShipping = e.target.value;
      renderCart();
    });
  });

  // Proceed button
  document.getElementById('proceed-btn').addEventListener('click', handleProceed);
}

function cartItemHTML(item) {
  return `
<div class="cart-item">
  <img class="item-img" src="${item.image1}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/70x90/1a1a1a/333?text=J'"/>
  <div class="item-details">
    <div class="item-name">${item.name}</div>
    <div class="item-meta">Size: ${item.size} · SKU: ${item.sku}</div>
    <div class="item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</div>
  </div>
  <div class="item-right">
    <div class="qty-controls">
      <button class="qty-btn" data-key="${item.key}" data-delta="-1">−</button>
      <div class="qty-display">${item.qty}</div>
      <button class="qty-btn" data-key="${item.key}" data-delta="1">+</button>
    </div>
    <button class="remove-btn" data-key="${item.key}">Remove</button>
  </div>
</div>`;
}

// ── Proceed ───────────────────────────────────────────────────────────────
async function handleProceed() {
  const fields = {
    name: document.getElementById('f-name')?.value.trim(),
    phone: document.getElementById('f-phone')?.value.trim(),
    email: document.getElementById('f-email')?.value.trim(),
    address: document.getElementById('f-address')?.value.trim(),
    city: document.getElementById('f-city')?.value.trim(),
    state: document.getElementById('f-state')?.value.trim(),
    pincode: document.getElementById('f-pincode')?.value.trim(),
  };

  for (const [k, v] of Object.entries(fields)) {
    if (!v) { showToast(`Please fill in: ${k}`); return; }
  }

  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const shippingFee = getShippingFee(selectedShipping, subtotal);
  const total = subtotal + shippingFee;

  const btn = document.getElementById('proceed-btn');
  btn.textContent = 'Creating order...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fields,
        shipping_method: SHIPPING[selectedShipping].label,
        subtotal, shipping_fee: shippingFee, total,
        items: cart.map(i => ({ sku: i.sku, name: i.name, size: i.size, qty: i.qty, price: i.price }))
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    // Build Instagram DM message
    const orderNo = data.order_no;
    const itemLines = cart.map(i => `• ${i.name} | Size: ${i.size} | Qty: ${i.qty} | ₹${i.price}`).join('\n');
    const msg = `Hi! I'd like to place an order.\n\n` +
      `Order No: ${orderNo}\n\n` +
      `ITEMS:\n${itemLines}\n\n` +
      `Subtotal: ₹${subtotal}\nShipping: ${shippingFee === 0 ? 'FREE' : '₹'+shippingFee} (${SHIPPING[selectedShipping].label})\nTotal: ₹${total}\n\n` +
      `DELIVERY TO:\n${fields.name}\n${fields.phone} | ${fields.email}\n${fields.address}, ${fields.city}, ${fields.state} – ${fields.pincode}`;

    // Copy order details to clipboard (best effort)
    try { await navigator.clipboard.writeText(msg); } catch(e) {}

    // Clear cart
    localStorage.removeItem('jersivo_cart');

    // Show modal
    showOrderModal(orderNo, msg);

  } catch(err) {
    showToast('Error creating order. Please try again.');
    btn.textContent = 'Proceed to Instagram →';
    btn.disabled = false;
  }
}

// ── Order Modal ───────────────────────────────────────────────────────────
function showOrderModal(orderNo, msg) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);
    display:flex;align-items:center;justify-content:center;padding:1.5rem;
  `;
  overlay.innerHTML = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:14px;padding:1.75rem;max-width:480px;width:100%;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:0.05em;margin-bottom:0.25rem;">Order Created!</div>
      <div style="font-size:0.8rem;color:#777;margin-bottom:1.25rem;">Order No: <strong style="color:#e5e5e5">${orderNo}</strong></div>

      <p style="font-size:0.85rem;color:#aaa;margin-bottom:1rem;line-height:1.5;">
        Your order details have been <strong style="color:#04FBFF">copied to clipboard</strong>.<br/>
        Tap the button below to open Instagram, then paste the message into the DM with <strong style="color:#e5e5e5">@shop.jersivo</strong>.
      </p>

      <textarea readonly style="
        width:100%;height:130px;background:#111;border:1px solid #2a2a2a;
        border-radius:8px;color:#777;font-size:0.72rem;padding:10px;
        resize:none;font-family:monospace;margin-bottom:1rem;outline:none;
      ">${msg}</textarea>

      <div style="display:flex;flex-direction:column;gap:0.6rem;">
        <button id="modal-copy-btn" style="
          padding:11px;background:linear-gradient(135deg,#48A6FD,#04FBFF);
          border:none;border-radius:8px;color:#000;font-weight:700;
          font-family:'DM Sans',sans-serif;font-size:0.88rem;cursor:pointer;
        ">Copy Again</button>
        <a href="https://www.instagram.com/shop.jersivo" target="_blank" style="
          display:block;padding:11px;background:#111;border:1px solid #2a2a2a;
          border-radius:8px;color:#e5e5e5;font-weight:600;text-align:center;
          font-family:'DM Sans',sans-serif;font-size:0.88rem;text-decoration:none;
        ">Open @shop.jersivo on Instagram →</a>
        <button id="modal-done-btn" style="
          padding:9px;background:none;border:none;color:#555;
          font-family:'DM Sans',sans-serif;font-size:0.82rem;cursor:pointer;
        ">Done</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById('modal-copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(msg);
      document.getElementById('modal-copy-btn').textContent = 'Copied!';
      setTimeout(() => { document.getElementById('modal-copy-btn').textContent = 'Copy Again'; }, 2000);
    } catch(e) {}
  });

  document.getElementById('modal-done-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    location.href = '/';
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
