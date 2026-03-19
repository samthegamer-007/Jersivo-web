const express = require('express');
const router = express.Router();
const auth = require('../auth');
const logger = require('../logger');
const { addProduct, updateProduct, deleteProduct, getAllProducts } = require('../../database/products');
const { generateSKU, CATEGORY_PREFIX_MAP } = require('../../database/sku');

// ============================================
// ADMIN PRODUCT ROUTES (NEW SYSTEM)
// All routes use database/products.js
// ============================================

/**
 * GET /api/admin/products
 * Get all products for admin panel
 */
router.get('/products', auth.requireAdmin, async (req, res) => {
  try {
    const products = await getAllProducts();
    
    // Filter out deleted products (status = "Deleted")
    const liveProducts = products.filter(p => p.status !== 'Deleted');
    
    res.json(liveProducts);
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * POST /api/admin/products/generate-sku
 * Generate SKU preview (before adding product)
 */
router.post('/products/generate-sku', auth.requireAdmin, async (req, res) => {
  try {
    const { category, teamCode } = req.body;
    
    if (!category || !teamCode) {
      return res.status(400).json({ error: 'Category and teamCode required' });
    }
    
    const sku = await generateSKU(category, teamCode);
    
    res.json({ success: true, sku });
  } catch (error) {
    console.error('Error generating SKU:', error);
    res.status(500).json({ error: 'Failed to generate SKU' });
  }
});

/**
 * POST /api/admin/products
 * Add new product with auto-generated SKU
 */
router.post('/products', auth.requireAdmin, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const username = user?.username || 'admin';
    
    const {
      category,
      teamCode,
      name,
      price,
      image1,
      image2,
      description,
      customisable,
      sizes,
      label
    } = req.body;
    
    // Validate required fields
    if (!category || !teamCode || !name || !price || !label) {
      return res.status(400).json({ 
        error: 'Missing required fields: category, teamCode, name, price, label' 
      });
    }

    if (!image1 || !image2) {
      return res.status(400).json({ 
        error: 'Both image1 and image2 are required' 
      });
    }
    
    // Validate category
    if (!CATEGORY_PREFIX_MAP[category]) {
      return res.status(400).json({ 
        error: 'Invalid category' 
      });
    }
    
    const productData = {
      category,
      teamCode,
      name,
      price,
      image1,
      image2,
      description,
      customisable,
      sizes,
      label
    };
    
    // Add product (SKU auto-generated inside)
    const result = await addProduct(productData, username);
    
    // Log admin action
    await logger.logProductAdded(username, result.sku);
    
    res.json(result);
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

/**
 * PUT /api/admin/products/:sku
 * Update existing product
 */
router.put('/products/:sku', auth.requireAdmin, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const username = user?.username || 'admin';
    const { sku } = req.params;
    
    const updates = req.body;
    
    // Don't allow changing SKU, category, or status
    delete updates.sku;
    delete updates.id;
    delete updates.category;
    delete updates.status;
    delete updates.created_at;
    delete updates.created_by;
    
    const result = await updateProduct(sku, updates, username);
    
    // Log admin action
    await logger.logProductUpdated(username, sku);
    
    res.json(result);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/admin/products/:sku
 * Soft delete product (mark as Deleted, remove from category sheet)
 */
router.delete('/products/:sku', auth.requireAdmin, async (req, res) => {
  try {
    const user = auth.getCurrentUser(req);
    const username = user?.username || 'admin';
    const { sku } = req.params;
    
    const result = await deleteProduct(sku, username);
    
    // Log admin action
    await logger.logProductDeleted(username, sku);
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * GET /api/admin/products/deleted
 * Get all deleted products (for owner review)
 */
router.get('/products/deleted', auth.requireAdmin, async (req, res) => {
  try {
    const products = await getAllProducts();
    
    // Filter only deleted products
    const deletedProducts = products.filter(p => p.status === 'Deleted');
    
    res.json(deletedProducts);
  } catch (error) {
    console.error('Error fetching deleted products:', error);
    res.status(500).json({ error: 'Failed to fetch deleted products' });
  }
});

module.exports = router;
