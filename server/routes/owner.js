const express = require('express');
const router = express.Router();
const auth = require('../auth');
const googleSheets = require('../googleSheets');
const logger = require('../logger');
const { getAllProducts, updateProduct } = require('../../database/products');
const { updateSKUStatus } = require('../../database/sku');
const {
  getAllOrders,
  getPendingRequests,
  confirmOrder: dbConfirmOrder,
  rejectOrder: dbRejectOrder,
  getCustomerList
} = require('../../database/orders');

// ============================================
// OWNER-ONLY ROUTES (Multi-Admin + Product Review)
// ============================================

/**
 * GET /api/owner/delete-requests
 */
router.get('/delete-requests', auth.requireOwner, async (req, res) => {
  try {
    const products = await getAllProducts();
    const deleteRequests = products.filter(p => p.status === 'Deleted');
    res.json({ success: true, requests: deleteRequests });
  } catch (error) {
    console.error('Error fetching delete requests:', error);
    res.status(500).json({ error: 'Failed to fetch delete requests' });
  }
});

/**
 * POST /api/owner/approve-delete
 */
router.post('/approve-delete/:sku?', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const sku = req.params.sku || req.body.sku;
    if (!sku) return res.status(400).json({ error: 'sku required' });
    await updateSKUStatus(sku, 'Deleted');
    await logger.logDeleteApproved(user.username, sku);
    res.json({ success: true, message: 'Product deletion approved' });
  } catch (error) {
    console.error('Error approving delete:', error);
    res.status(500).json({ error: 'Failed to approve delete' });
  }
});

/**
 * POST /api/owner/deny-delete
 */
router.post('/deny-delete/:sku?', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const sku = req.params.sku || req.body.sku;
    if (!sku) return res.status(400).json({ error: 'sku required' });
    await updateProduct(sku, { status: 'Live' }, 'OWNER_RESTORE');
    await logger.logDeleteDenied(user.username, sku);
    res.json({ success: true, message: 'Product restored to Live' });
  } catch (error) {
    console.error('Error denying delete:', error);
    res.status(500).json({ error: 'Failed to deny delete' });
  }
});

// ============================================
// MULTI-ADMIN MANAGEMENT
// ============================================

/**
 * GET /api/owner/admins
 */
router.get('/admins', auth.requireOwner, async (req, res) => {
  try {
    const credentials = await googleSheets.readCredentials();
    const admins = credentials.filter(c => c.role === 'ADMIN' || c.role === 'OWNER');
    const safeAdmins = admins.map(admin => ({
      username: admin.username,
      name: admin.name,
      role: admin.role,
      status: admin.status,
      created_at: admin.created_at,
      created_by: admin.created_by,
    }));
    res.json({ success: true, admins: safeAdmins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

/**
 * POST /api/owner/add-admin
 */
router.post('/add-admin', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        error: 'Username, password, and name are required'
      });
    }

    const credentials = await googleSheets.readCredentials();
    const exists = credentials.some(c => c.username === username);

    if (exists) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = auth.hashPassword(password);

    await googleSheets.writeCredential({
      username,
      password: hashedPassword,
      name,
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      created_by: user.username,
    });

    await logger.logAdminAdded(user.username, username);
    res.json({ success: true, message: 'Admin added successfully' });
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ error: 'Failed to add admin' });
  }
});

/**
 * POST /api/owner/change-admin-password
 */
router.post('/change-admin-password', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const { targetUsername, newPassword } = req.body;

    if (!targetUsername || !newPassword) {
      return res.status(400).json({
        error: 'Target username and new password are required'
      });
    }

    const credentials = await googleSheets.readCredentials();
    const adminIndex = credentials.findIndex(c => c.username === targetUsername);

    if (adminIndex === -1) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const hashedPassword = auth.hashPassword(newPassword);

    await googleSheets.updateCredential(targetUsername, {
      password: hashedPassword
    });

    await logger.logPasswordChanged(user.username, targetUsername);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/owner/block-admin
 */
router.post('/block-admin', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const { targetUsername, block } = req.body;

    if (!targetUsername || typeof block !== 'boolean') {
      return res.status(400).json({
        error: 'Target username and block status required'
      });
    }

    const newStatus = block ? 'BLOCKED' : 'ACTIVE';
    await googleSheets.updateCredential(targetUsername, { status: newStatus });
    await logger.logAdminStatusChanged(user.username, targetUsername, newStatus);

    res.json({
      success: true,
      message: `Admin ${block ? 'blocked' : 'unblocked'} successfully`
    });
  } catch (error) {
    console.error('Error blocking/unblocking admin:', error);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

/**
 * POST /api/owner/remove-admin
 */
router.post('/remove-admin', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const { targetUsername } = req.body;

    if (!targetUsername) {
      return res.status(400).json({ error: 'Target username required' });
    }

    const credentials = await googleSheets.readCredentials();
    const targetAdmin = credentials.find(c => c.username === targetUsername);

    if (!targetAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (targetAdmin.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot remove owner' });
    }

    await googleSheets.deleteCredential(targetUsername);
    await logger.logAdminRemoved(user.username, targetUsername);
    res.json({ success: true, message: 'Admin removed successfully' });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ error: 'Failed to remove admin' });
  }
});

/**
 * GET /api/owner/dashboard-stats
 */
router.get('/dashboard-stats', auth.requireOwner, async (req, res) => {
  try {
    const [credentials, products, pendingOrders] = await Promise.all([
      googleSheets.readCredentials(),
      getAllProducts(),
      getPendingRequests()
    ]);

    const activeAdmins = credentials.filter(c => ['ADMIN','admin'].includes(c.role) && ['ACTIVE','active'].includes(c.status)).length;
    const totalAdmins = credentials.filter(c => ['ADMIN','admin'].includes(c.role)).length;
    const pendingDeletes = products.filter(p => p.status === 'Deleted').length;

    res.json({
      success: true,
      stats: {
        pendingDeletes,
        activeAdmins,
        totalAdmins,
        pendingOrders: pendingOrders.length
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * GET /api/owner/products
 */
router.get('/products', auth.requireOwner, async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products for owner:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/owner/orders
 */
router.get('/orders', auth.requireOwner, async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * POST /api/owner/confirm-order
 */
router.post('/confirm-order', auth.requireOwner, async (req, res) => {
  try {
    const { orderNo } = req.body;
    if (!orderNo) return res.status(400).json({ error: 'orderNo required' });
    const result = await dbConfirmOrder(orderNo);
    res.json(result);
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

/**
 * POST /api/owner/reject-order
 */
router.post('/reject-order', auth.requireOwner, async (req, res) => {
  try {
    const { orderNo } = req.body;
    if (!orderNo) return res.status(400).json({ error: 'orderNo required' });
    const result = await dbRejectOrder(orderNo);
    res.json(result);
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

/**
 * GET /api/owner/customer-list
 */
router.get('/customer-list', auth.requireOwner, async (req, res) => {
  try {
    const customers = await getCustomerList();
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Error fetching customer list:', error);
    res.status(500).json({ error: 'Failed to fetch customer list' });
  }
});

/**
 * GET /api/owner/audit-logs
 */
router.get('/audit-logs', auth.requireOwner, async (req, res) => {
  try {
    const [authLogs, productLogs, ownerLogs] = await Promise.all([
      googleSheets.readLogs('Authentication'),
      googleSheets.readLogs('Product Actions'),
      googleSheets.readLogs('Owner Actions')
    ]);

    const format = (logs) => (logs || []).map(l => ({
      timestamp:  l.timestamp    || '',
      username:   l.admin_id     || '',
      action:     l.action       || '',
      details:    l.details      || l.user_agent || '',
      product_id: l.product_id   || l.affected_item || '',
    }));

    const allLogs = [
      ...format(authLogs),
      ...format(productLogs),
      ...format(ownerLogs)
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, logs: allLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * POST /api/owner/deactivate-admin
 */
router.post('/deactivate-admin', auth.requireOwner, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    await googleSheets.updateCredential(username, { status: 'BLOCKED' });
    res.json({ success: true, message: 'Admin deactivated' });
  } catch (error) {
    console.error('Error deactivating admin:', error);
    res.status(500).json({ error: 'Failed to deactivate admin' });
  }
});

/**
 * POST /api/owner/reactivate-admin
 */
router.post('/reactivate-admin', auth.requireOwner, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    await googleSheets.updateCredential(username, { status: 'ACTIVE' });
    res.json({ success: true, message: 'Admin reactivated' });
  } catch (error) {
    console.error('Error reactivating admin:', error);
    res.status(500).json({ error: 'Failed to reactivate admin' });
  }
});

module.exports = router;
