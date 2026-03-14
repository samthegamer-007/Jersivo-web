const express = require('express');
const router = express.Router();
const { addProduct, updateProduct, deleteProduct, getAllProducts, getProductsByCategory } = require('../../database/products');
const { generateSKU } = require('../../database/sku');

// Middleware to check admin authentication
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.role || req.session.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * POST /api/admin/products/generate-sku
 * Generate SKU for preview (before creating product)
 */
router.post('/generate-sku', requireAdmin, async (req, res) => {
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
 * Add new product
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const productData = req.body;
    const username = req.session.username || 'admin';
    
    const result = await addProduct(productData, username);
    
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
router.put('/:sku', requireAdmin, async (req, res) => {
  try {
    const { sku } = req.params;
    const updates = req.body;
    const username = req.session.username || 'admin';
    
    const result = await updateProduct(sku, updates, username);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/admin/products/:sku
 * Delete product (soft delete)
 */
router.delete('/:sku', requireAdmin, async (req, res) => {
  try {
    const { sku } = req.params;
    const username = req.session.username || 'admin';
    
    const result = await deleteProduct(sku, username);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * GET /api/admin/products
 * Get all products (for admin panel)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const products = await getAllProducts();
    
    res.json({ success: true, products });
    
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

/**
 * GET /api/products/category/:category
 * Get products by category (for customer browsing)
 * No auth required - public endpoint
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const products = await getProductsByCategory(category);
    
    res.json({ success: true, products });
    
  } catch (error) {
    console.error('Error getting products by category:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

module.exports = router;
