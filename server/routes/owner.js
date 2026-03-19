const express = require('express');
const router = express.Router();
const auth = require('../auth');
const googleSheets = require('../googleSheets');
const logger = require('../logger');
const { getAllProducts, updateProduct } = require('../../database/products');
const { updateSKUStatus } = require('../../database/sku');

// ============================================
// OWNER-ONLY ROUTES (Multi-Admin + Product Review)
// ============================================

/**
 * GET /api/owner/delete-requests
 * Get all products marked as "Deleted" (awaiting owner review)
 */
router.get('/delete-requests', auth.requireOwner, async (req, res) => {
  try {
    const products = await getAllProducts();
    
    // Filter only deleted products
    const deleteRequests = products.filter(p => p.status === 'Deleted');
    
    res.json(deleteRequests);
  } catch (error) {
    console.error('Error fetching delete requests:', error);
    res.status(500).json({ error: 'Failed to fetch delete requests' });
  }
});

/**
 * POST /api/owner/approve-delete/:sku
 * Permanently approve deletion (update SKU status to "Deleted" in ID Management)
 */
router.post('/approve-delete/:sku', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const { sku } = req.params;
    
    // Update SKU status in Products ID Management
    await updateSKUStatus(sku, 'Deleted');
    
    // Log owner action
    await logger.logDeleteApproved(user.username, sku);
    
    res.json({ success: true, message: 'Product deletion approved' });
  } catch (error) {
    console.error('Error approving delete:', error);
    res.status(500).json({ error: 'Failed to approve delete' });
  }
});

/**
 * POST /api/owner/deny-delete/:sku
 * Restore deleted product (change status back to "Live")
 */
router.post('/deny-delete/:sku', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const { sku } = req.params;
    
    // Restore product to Live status
    // This will re-add to category sheet in database/products.js
    await updateProduct(sku, { status: 'Live' }, 'OWNER_RESTORE');
    
    // Log owner action
    await logger.logDeleteDenied(user.username, sku);
    
    res.json({ success: true, message: 'Product restored to Live' });
  } catch (error) {
    console.error('Error denying delete:', error);
    res.status(500).json({ error: 'Failed to deny delete' });
  }
});

// ============================================
// MULTI-ADMIN MANAGEMENT (Keep from old system)
// ============================================

/**
 * GET /api/owner/admins
 * Get all admins
 */
router.get('/admins', auth.requireOwner, async (req, res) => {
  try {
    const credentials = await googleSheets.readCredentials();
    
    // Filter only admins (not owner)
    const admins = credentials.filter(c => c.role === 'ADMIN' || c.role === 'OWNER');
    
    // Don't send passwords
    const safeAdmins = admins.map(admin => ({
      username: admin.username,
      name: admin.name,
      role: admin.role,
      status: admin.status,
      created_at: admin.created_at,
      created_by: admin.created_by,
    }));
    
    res.json(safeAdmins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

/**
 * POST /api/owner/add-admin
 * Add new admin
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
    
    // Check if username already exists
    const credentials = await googleSheets.readCredentials();
    const exists = credentials.some(c => c.username === username);
    
    if (exists) {
      return res.status(400).json({ 
        error: 'Username already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = auth.hashPassword(password);
    
    // Create new admin credential
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
 * Change admin password
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
    
    // Update password
    const hashedPassword = auth.hashPassword(newPassword);
    credentials[adminIndex].password = hashedPassword;
    
    // Write back to sheet
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
 * Block/unblock admin
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
    
    await googleSheets.updateCredential(targetUsername, {
      status: newStatus
    });
    
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
 * Permanently remove admin
 */
router.post('/remove-admin', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const { targetUsername } = req.body;
    
    if (!targetUsername) {
      return res.status(400).json({ error: 'Target username required' });
    }
    
    // Don't allow removing owner
    const credentials = await googleSheets.readCredentials();
    const targetAdmin = credentials.find(c => c.username === targetUsername);
    
    if (!targetAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    if (targetAdmin.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot remove owner' });
    }
    
    // Remove admin
    await googleSheets.deleteCredential(targetUsername);
    
    await logger.logAdminRemoved(user.username, targetUsername);
    
    res.json({ success: true, message: 'Admin removed successfully' });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ error: 'Failed to remove admin' });
  }
});

module.exports = router;
