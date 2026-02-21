const express = require('express');
const router = express.Router();
const auth = require('../auth');
const googleSheets = require('../googleSheets');
const logger = require('../logger');
const { syncProductsToCache } = require('../../database/init');

// ============================================
// ADMIN PRODUCT ROUTES
// All routes here require admin authentication
// ============================================

// Get all products for admin panel
router.get('/products', auth.requireAdmin, async (req, res) => {
  try {
    const sheetName = req.query.sheet || 'Sheet1';
    
    // Admin sees all products from Google Sheets
    const products = await googleSheets.readProducts(sheetName);
    
    // Filter out DELETION_PENDING (admin thinks they're deleted)
    const visibleProducts = products.filter(p => p.status !== 'DELETION_PENDING');
    
    res.json(visibleProducts);
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add new product
router.post('/products', auth.requireAdmin, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const sheetName = req.body.sheetName || 'Sheet1';
    
    // Validate required fields
    if (!req.body.id || !req.body.name || !req.body.price || !req.body.label) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, name, price, label' 
      });
    }

    // Validate images
    if (!req.body.image1 || !req.body.image2) {
      return res.status(400).json({ 
        error: 'Both image1 and image2 are required' 
      });
    }

    const product = {
      ...req.body,
      status: 'LIVE',
      created_at: new Date().toISOString(),
      created_by: user.username,
      last_modified_at: new Date().toISOString(),
      last_modified_by: user.username,
    };

    // Write to Google Sheets
    await googleSheets.writeProduct(sheetName, product);
    
    // Log action
    await logger.logProductAction(
      'PRODUCT_ADD',
      user,
      product.id,
      `Added ${product.name} to ${sheetName}`
    );

    // Sync cache
    await syncProductsToCache(sheetName);

    // Emit WebSocket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.to('owner-room').emit('notification', {
        type: 'product_added',
        message: `${user.name} added product ${product.id}`,
        timestamp: Date.now(),
      });
    }

    res.json({ 
      success: true, 
      message: 'Product added successfully',
      productId: product.id 
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update product
router.put('/products/:id', auth.requireAdmin, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const productId = req.params.id;
    const sheetName = req.body.sheetName || 'Sheet1';
    
    const updates = {
      ...req.body,
      last_modified_at: new Date().toISOString(),
      last_modified_by: user.username,
    };

    // Remove sheetName from updates (it's not a product field)
    delete updates.sheetName;

    // Update in Google Sheets
    await googleSheets.updateProduct(sheetName, productId, updates);
    
    // Log action
    await logger.logProductAction(
      'PRODUCT_EDIT',
      user,
      productId,
      `Updated ${updates.name || productId} in ${sheetName}`
    );

    // Sync cache
    await syncProductsToCache(sheetName);

    // Emit WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.to('owner-room').emit('notification', {
        type: 'product_edited',
        message: `${user.name} edited product ${productId}`,
        timestamp: Date.now(),
      });
    }

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (SOFT DELETE - stealth mode!)
router.delete('/products/:id', auth.requireAdmin, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const productId = req.params.id;
    const sheetName = req.query.sheet || 'Sheet1';
    
    // Soft delete (mark as DELETION_PENDING)
    await googleSheets.softDeleteProduct(sheetName, productId, user.username);
    
    // Log delete request
    await logger.logProductAction(
      'DELETE_REQUEST',
      user,
      productId,
      `Requested deletion from ${sheetName}`
    );

    // Sync cache (product will be hidden)
    await syncProductsToCache(sheetName);

    // Emit WebSocket event to owner
    const io = req.app.get('io');
    if (io) {
      io.to('owner-room').emit('notification', {
        type: 'delete_request',
        message: `${user.name} requested deletion of ${productId}`,
        timestamp: Date.now(),
        priority: 'high',
      });
      
      // Update delete request count
      io.to('owner-room').emit('delete:count:update');
    }

    // Respond as if product was actually deleted (stealth!)
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get available sheets/categories
router.get('/sheets', auth.requireAdmin, async (req, res) => {
  try {
    // For now, return hardcoded list
    // Later, you can query Google Sheets API for actual sheet names
    const sheets = [
      'Sheet1',
      'All Products',
      'Club Jerseys',
      'National Team Jerseys',
      'Retro Jerseys',
      'Keychains',
      'Caps',
      'Scarves',
    ];
    
    res.json(sheets);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
});

module.exports = router;