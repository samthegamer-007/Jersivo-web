const { readFromSheet } = require('../server/googleSheets');

/**
 * Search products with optional filters
 * @param {Object} options - Search options
 * @param {string} options.query - Search query (optional)
 * @param {string} options.category - Category filter (optional)
 * @param {string[]} options.excludeCategories - Categories to exclude (optional)
 * @param {boolean} options.featured - Filter by featured (optional)
 * @param {number} options.limit - Max results (optional)
 * @returns {Promise<Array>} Matching products
 */
async function searchProducts(options = {}) {
  try {
    const { query, category, excludeCategories, featured, limit } = options;
    
    // Read all products from Sheet1
    const allProducts = await readFromSheet(
      'Sheet1',
      process.env.GOOGLE_SHEET_ID_PRODUCTS
    );
    
    if (!allProducts || allProducts.length === 0) {
      return [];
    }
    
    // Parse products
    let products = allProducts.map(row => ({
      sku: row[0] || '',
      name: row[1] || '',
      price: row[2] || '',
      category: row[3] || '',
      image1: row[4] || '',
      image2: row[5] || '',
      description: row[6] || '',
      customizable: row[7] || 'No',
      sizes: row[8] || '',
      label: row[9] || '',             // J: label (NEW, HOT, LIMITED, BESTSELLER, etc)
      status: row[10] || 'LIVE',
      createdAt: row[11] || '',
      createdBy: row[12] || '',
      lastModified: row[13] || '',
      lastModifiedBy: row[14] || ''
    }));
    
    // Filter out deleted products (keep LIVE ones)
    products = products.filter(p => p.status === 'LIVE');
    
    // Filter out deleted/inactive products
    products = products.filter(p => p.status === 'active');
    
    // Apply category filter
    if (category) {
      products = products.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Apply excludeCategories filter
    if (excludeCategories && excludeCategories.length > 0) {
      const excludeLower = excludeCategories.map(c => c.toLowerCase());
      products = products.filter(p => 
        !excludeLower.includes(p.category.toLowerCase())
      );
    }
    
    // Apply featured filter
    if (featured === true || featured === 'true') {
      products = products.filter(p => p.featured === true);
    }
    
    // Apply search query
    if (query && query.trim() !== '') {
      const searchLower = query.toLowerCase().trim();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower) ||
        p.teamCode.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply limit
    if (limit && limit > 0) {
      products = products.slice(0, parseInt(limit));
    }
    
    return products;
    
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
}

module.exports = {
  searchProducts
};
