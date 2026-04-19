// server/index.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const { getLiveProducts, getAllProducts, addProduct, updateProduct, deleteProduct } = require('../database/products');
const { createOrder } = require('../database/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jersivo-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }, // 24h
}));
app.use(express.static(path.join(__dirname, '../public')));

// ── Auth Middleware ────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Kill Switch state (in-memory, resets on server restart) ───────────────
// Persisted via a lightweight approach: store in session isn't right.
// We store it server-side as module-level variable.
let killSwitchEnabled = false;

// ── PUBLIC API ─────────────────────────────────────────────────────────────

// Kill switch status (checked by frontend before rendering)
app.get('/api/status', (req, res) => {
  res.json({ maintenance: killSwitchEnabled });
});

// GET /api/products → all LIVE products
app.get('/api/products', async (req, res) => {
  try {
    const products = await getLiveProducts();
    res.json(products);
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/orders → create order, return order_no
app.post('/api/orders', async (req, res) => {
  try {
    const required = ['name','phone','email','address','city','state','pincode','shipping_method','subtotal','shipping_fee','total','items'];
    for (const field of required) {
      if (!req.body[field] && req.body[field] !== 0) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }
    const result = await createOrder(req.body);
    res.json(result);
  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ── ADMIN API ──────────────────────────────────────────────────────────────

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMN_USRNM &&
    password === process.env.ADMN_PSWRD
  ) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// POST /api/admin/logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/admin/session → check if logged in
app.get('/api/admin/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// GET /api/admin/products → all products including deleted
app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err) {
    console.error('GET /api/admin/products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/admin/products → add product
app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const product = await addProduct(req.body);
    res.json(product);
  } catch (err) {
    console.error('POST /api/admin/products error:', err);
    res.status(500).json({ error: err.message || 'Failed to add product' });
  }
});

// PUT /api/admin/products/:sku → update product
app.put('/api/admin/products/:sku', requireAdmin, async (req, res) => {
  try {
    const product = await updateProduct(req.params.sku, req.body);
    res.json(product);
  } catch (err) {
    console.error('PUT /api/admin/products/:sku error:', err);
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:sku → soft delete
app.delete('/api/admin/products/:sku', requireAdmin, async (req, res) => {
  try {
    await deleteProduct(req.params.sku);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/products/:sku error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
});

// GET/POST /api/admin/killswitch → toggle maintenance mode
app.get('/api/admin/killswitch', requireAdmin, (req, res) => {
  res.json({ enabled: killSwitchEnabled });
});

app.post('/api/admin/killswitch', requireAdmin, (req, res) => {
  killSwitchEnabled = !!req.body.enabled;
  res.json({ enabled: killSwitchEnabled });
});

// ── SPA fallback for admin pages ───────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Jersivo server running on port ${PORT}`);
});
