const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { db, syncProductsToCache, getProductsFromCache } = require('../database/init');
const auth = require('./auth');
const googleSheets = require('./googleSheets');
const adminRoutes = require('./routes/admin');
const ownerRoutes = require('./routes/owner'); 
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/owner', express.static(path.join(__dirname, '../owner')));

// Explicitly serve CSS files
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'jersivo-secret-key-fallback',
    resave: false,
      saveUninitialized: false,
        cookie: { 
            secure: false,
                maxAge: 4 * 60 * 60 * 1000 // 4 hours
                  }
                  }));
                  // ============================================
// SERVE HTML PAGES
// ============================================

// Serve admin panel HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/admin.html'));
});

// Serve owner panel HTML  
app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, '../owner/owner.html'));
});

// Serve main website (root)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
                  // ============================================
                  // AUTHENTICATION ROUTES
                  // ============================================

                  // Login endpoint
                  app.post('/api/login', async (req, res) => {
                    try {
                        const { username, password } = req.body;

                            if (!username || !password) {
                                  return res.status(400).json({ 
                                          success: false, 
                                                  error: 'Username and password required' 
                                                        });
                                                            }

                                                                // Validate credentials against Google Sheets
                                                                    const user = await auth.validateCredentials(username, password);

                                                                        if (user) {
                                                                              // Create session
                                                                                    req.session.user = user;
                                                                                          
                                                                                                // Log authentication
                                                                                                      await googleSheets.writeLog('Authentication', {
                                                                                                              timestamp: new Date().toISOString(),
                                                                                                                      admin_id: user.username,
                                                                                                                              admin_name: user.name,
                                                                                                                                      action: 'LOGIN',
                                                                                                                                              ip: req.ip || req.connection.remoteAddress,
                                                                                                                                                      user_agent: req.get('user-agent') || 'Unknown',
                                                                                                                                                            });

                                                                                                                                                                  res.json({ 
                                                                                                                                                                          success: true, 
                                                                                                                                                                                  user: {
                                                                                                                                                                                            username: user.username,
                                                                                                                                                                                                      name: user.name,
                                                                                                                                                                                                                role: user.role,
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                  } else {
                                                                                                                                                                                                                                        res.status(401).json({ 
                                                                                                                                                                                                                                                success: false, 
                                                                                                                                                                                                                                                        error: 'Invalid username or password' 
                                                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                    } catch (error) {
                                                                                                                                                                                                                                                                        console.error('Login error:', error);
                                                                                                                                                                                                                                                                            res.status(500).json({ 
                                                                                                                                                                                                                                                                                  success: false, 
                                                                                                                                                                                                                                                                                        error: 'Login failed. Please try again.' 
                                                                                                                                                                                                                                                                                            });
                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                              });

                                                                                                                                                                                                                                                                                              // Logout endpoint
                                                                                                                                                                                                                                                                                              app.post('/api/logout', (req, res) => {
                                                                                                                                                                                                                                                                                                const user = auth.getCurrentUser(req);
                                                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                                                    if (user) {
                                                                                                                                                                                                                                                                                                        // Log logout
                                                                                                                                                                                                                                                                                                            googleSheets.writeLog('Authentication', {
                                                                                                                                                                                                                                                                                                                  timestamp: new Date().toISOString(),
                                                                                                                                                                                                                                                                                                                        admin_id: user.username,
                                                                                                                                                                                                                                                                                                                              admin_name: user.name,
                                                                                                                                                                                                                                                                                                                                    action: 'LOGOUT',
                                                                                                                                                                                                                                                                                                                                          ip: req.ip || req.connection.remoteAddress,
                                                                                                                                                                                                                                                                                                                                                user_agent: req.get('user-agent') || 'Unknown',
                                                                                                                                                                                                                                                                                                                                                    }).catch(err => console.error('Error logging logout:', err));
                                                                                                                                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                                                                                                                                        req.session.destroy((err) => {
                                                                                                                                                                                                                                                                                                                                                            if (err) {
                                                                                                                                                                                                                                                                                                                                                                  res.status(500).json({ success: false, error: 'Logout failed' });
                                                                                                                                                                                                                                                                                                                                                                      } else {
                                                                                                                                                                                                                                                                                                                                                                            res.json({ success: true });
                                                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                                                                                                                                                                  // Check session endpoint
                                                                                                                                                                                                                                                                                                                                                                                  app.get('/api/check-session', (req, res) => {
                                                                                                                                                                                                                                                                                                                                                                                    const user = auth.getCurrentUser(req);
                                                                                                                                                                                                                                                                                                                                                                                      if (user) {
                                                                                                                                                                                                                                                                                                                                                                                          res.json({ 
                                                                                                                                                                                                                                                                                                                                                                                                authenticated: true, 
                                                                                                                                                                                                                                                                                                                                                                                                      user: {
                                                                                                                                                                                                                                                                                                                                                                                                              username: user.username,
                                                                                                                                                                                                                                                                                                                                                                                                                      name: user.name,
                                                                                                                                                                                                                                                                                                                                                                                                                              role: user.role,
                                                                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                                                                                                                                                                                          } else {
                                                                                                                                                                                                                                                                                                                                                                                                                                              res.json({ authenticated: false });
                                                                                                                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                                                                                                                                                                                                                                // ============================================
                                                                                                                                                                                                                                                                                                                                                                                                                                                // PUBLIC ROUTES (No authentication required)
                                                                                                                                                                                                                                                                                                                                                                                                                                                // ============================================

                                                                                                                                                                                                                                                                                                                                                                                                                                                // Get all products (for website)
                                                                                                                                                                                                                                                                                                                                                                                                                                                app.get('/api/products', async (req, res) => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                  try {
                                                                                                                                                                                                                                                                                                                                                                                                                                                      const { category, search, sort } = req.query;
                                                                                                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                                                                                              // Try to get from cache first
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  const products = await getProductsFromCache({ category, search, sort });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                                                                                                                                                                                                          res.json(products);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            } catch (error) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                console.error('Error fetching products:', error);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    res.status(500).json({ error: 'Failed to fetch products' });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      // Sync products from Google Sheets to cache (can be called manually)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      app.post('/api/sync-products', async (req, res) => {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        try {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            const sheetName = req.query.sheet || 'Sheet1';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                await syncProductsToCache(sheetName);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    res.json({ success: true, message: 'Products synced successfully' });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      } catch (error) {
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          console.error('Error syncing products:', error);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              res.status(500).json({ error: 'Failed to sync products' });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                // ============================================
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                // ADMIN ROUTES (Require admin authentication)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                // ============================================
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                // Mount admin routes
app.use('/api/admin', adminRoutes);
// Owner routes
app.use('/api/owner', ownerRoutes);
// Products routes
app.use('/api/admin/products', productsRoutes);
// Orders routes (public endpoint for creating requests)
app.use('/api/orders', ordersRoutes);
// Owner orders routes
app.use('/api/owner/orders', ordersRoutes);

// Serve static HTML pages
app.get('/club-jerseys', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/club-jerseys.html'));
});

app.get('/national-team', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/national-team.html'));
});

app.get('/retro-jerseys', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/retro-jerseys.html'));
});

app.get('/special-jerseys', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/special-jerseys.html'));
});

app.get('/other-apparel', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/other-apparel.html'));
});

app.get('/gifts', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/gifts.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cart.html'));
});

app.get('/return-policy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/return-policy.html'));
});

app.get('/faqs', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/faqs.html'));
});

// ============================================
// SERVER START
// ============================================

// Sync products on server start
syncProductsToCache('Sheet1').then(() => {
  console.log('✅ Initial product sync complete');
}).catch(err => {
  console.error('❌ Initial sync failed:', err);
});

// ==========================================
// LOGIN PAGE ROUTES
// ==========================================

app.get('/owner-login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/owner-login.html'));
});

app.get('/admin-login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Jersivo server running on port ${PORT}`);
  console.log(`📊 Using Google Sheets as database`);
  console.log(`💾 SQLite cache enabled`);
});
