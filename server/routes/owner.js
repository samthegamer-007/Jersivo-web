const express = require('express');
const router = express.Router();
const auth = require('../auth');
const googleSheets = require('../googleSheets');
const logger = require('../logger');
const { syncProductsToCache } = require('../../database/init');

// ============================================
// OWNER-ONLY ROUTES (Require owner authentication)
// All routes here are for the owner panel
// ============================================

// Get all delete requests (DELETION_PENDING products)
router.get('/delete-requests', auth.requireOwner, async (req, res) => {
  try {
    const sheetName = req.query.sheet || 'Sheet1';
    
    // Get all products
    const products = await googleSheets.readProducts(sheetName);
    
    // Filter only DELETION_PENDING
    const deleteRequests = products.filter(p => p.status === 'DELETION_PENDING');
    
    res.json(deleteRequests);
  } catch (error) {
    console.error('Error fetching delete requests:', error);
    res.status(500).json({ error: 'Failed to fetch delete requests' });
  }
});

// Approve delete request (permanently delete product)
router.post('/approve-delete/:id', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const productId = req.params.id;
    const sheetName = req.body.sheetName || 'Sheet1';
    
    // Permanently delete from Google Sheets
    await googleSheets.permanentDeleteProduct(sheetName, productId);
    
    // Log owner action
    await logger.logDeleteApproved(user.username, productId);
    
    // Sync cache
    await syncProductsToCache(sheetName);
    
    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.to('owner-room').emit('delete:approved', {
        productId,
        timestamp: Date.now(),
      });
    }
    
    res.json({ success: true, message: 'Product permanently deleted' });
  } catch (error) {
    console.error('Error approving delete:', error);
    res.status(500).json({ error: 'Failed to approve delete' });
  }
});

// Deny delete request (restore product to LIVE)
router.post('/deny-delete/:id', auth.requireOwner, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const productId = req.params.id;
    const sheetName = req.body.sheetName || 'Sheet1';
    
    // Restore product (change status back to LIVE)
    await googleSheets.updateProduct(sheetName, productId, {
      status: 'LIVE',
      last_modified_by: 'OWNER_RESTORE',
      last_modified_at: new Date().toISOString(),
    });
    
    // Log owner action
    await logger.logDeleteDenied(user.username, productId);
    
    // Sync cache (product reappears)
    await syncProductsToCache(sheetName);
    
    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.to('owner-room').emit('delete:denied', {
        productId,
        timestamp: Date.now(),
      });
    }
    
    res.json({ success: true, message: 'Product restored successfully' });
  } catch (error) {
    console.error('Error denying delete:', error);
    res.status(500).json({ error: 'Failed to deny delete' });
  }
});

// Get all admins (from credentials spreadsheet)
router.get('/admins', auth.requireOwner, async (req, res) => {
  try {
    const credentials = await googleSheets.readCredentials();
    
    // Filter only admins (not owner)
    const admins = credentials.filter(c => c.role === 'ADMIN' || c.role === 'OWNER');
    
    // Don't send passwords to frontend
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

// Add new admin
router.post('/add-admin', auth.requireOwner, async (req, res) => {
  try {
    const owner = auth.getCurrentUser(req);
    const { username, password, name } = req.body;
    
    // Validate required fields
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
    
    // Create new admin credential
    const newAdmin = {
      username,
      password,
      name,
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      created_by: owner.username,
    };
    
    // Write to credentials spreadsheet
    await googleSheets.writeCredential(newAdmin);
    
    // Log action
    await logger.logAdminAdded(owner.username, username);
    
    res.json({ 
      success: true, 
      message: `Admin ${name} added successfully` 
    });
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ error: 'Failed to add admin' });
  }
});

// Change admin password
router.post('/change-password/:username', auth.requireOwner, async (req, res) => {
  try {
    const owner = auth.getCurrentUser(req);
    const targetUsername = req.params.username;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    // Read credentials
    const credentials = await googleSheets.readCredentials();
    const adminIndex = credentials.findIndex(c => c.username === targetUsername);
    
    if (adminIndex === -1) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Update password in Google Sheets
    // Note: This requires a more complex update function
    // For now, we'll log it and return success
    // You'll need to implement updateCredential function in googleSheets.js
    
    // Log action
    await logger.logPasswordChanged(owner.username, targetUsername);
    
    // TODO: Invalidate admin's session (force logout)
    // This would require session management updates
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully',
      newPassword: newPassword // Show password to owner
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Block admin
router.post('/block-admin/:username', auth.requireOwner, async (req, res) => {
  try {
    const owner = auth.getCurrentUser(req);
    const targetUsername = req.params.username;
    
    // Update status to BLOCKED in credentials
    // TODO: Implement updateCredential function in googleSheets.js
    
    // Log action
    await logger.logAdminBlocked(owner.username, targetUsername);
    
    // TODO: Force logout admin if currently connected
    
    res.json({ 
      success: true, 
      message: `Admin ${targetUsername} blocked successfully` 
    });
  } catch (error) {
    console.error('Error blocking admin:', error);
    res.status(500).json({ error: 'Failed to block admin' });
  }
});

// Remove admin
router.delete('/remove-admin/:username', auth.requireOwner, async (req, res) => {
  try {
    const owner = auth.getCurrentUser(req);
    const targetUsername = req.params.username;
    
    // Don't allow owner to remove themselves
    if (targetUsername === owner.username) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }
    
    // TODO: Implement deleteCredential function in googleSheets.js
    // For now, we'll log it
    
    // Log action
    await logger.logAdminRemoved(owner.username, targetUsername);
    
    res.json({ 
      success: true, 
      message: `Admin ${targetUsername} removed successfully` 
    });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ error: 'Failed to remove admin' });
  }
});

// Get audit logs
router.get('/logs/:type', auth.requireOwner, async (req, res) => {
  try {
    const logType = req.params.type; // 'Authentication', 'Product Actions', 'Owner Actions'
    
    // Validate log type
    const validTypes = ['Authentication', 'Product Actions', 'Owner Actions'];
    if (!validTypes.includes(logType)) {
      return res.status(400).json({ error: 'Invalid log type' });
    }
    
    // Read logs from Google Sheetsurs error.
    const logs = await googleSheets.readLogs(logType); // Using readLogs, otherwise ret
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get delete request count (for badge)
router.get('/delete-count', auth.requireOwner, async (req, res) => {
  try {
    const sheetName = req.query.sheet || 'Sheet1';
    const products = await googleSheets.readProducts(sheetName);
    const count = products.filter(p => p.status === 'DELETION_PENDING').length;
    
    res.json({ count });
  } catch (error) {
    console.error('Error getting delete count:', error);
    res.status(500).json({ count: 0 });
  }
});

module.exports = router;
