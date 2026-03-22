const { readFromSheet } = require('../server/googleSheets');

async function searchProducts(options = {}) {
  try {
    const { query, category, excludeCategories, featured, limit } = options;

    const allProducts = await readFromSheet(
      'Sheet1',
      process.env.GOOGLE_SHEET_ID_PRODUCTS
    );

    if (!allProducts || allProducts.length === 0) {
      return [];
    }

    // Map columns to match Sheet1:
    // id, name, price, category, image1, image2, description,
    // customisable, sizes, label, status, created_at, created_by,
    // last_modified_at, last_modified_by
    let products = allProducts.map(row => ({
  sku:              row[0]  || '',
  name:             row[1]  || '',
  price:            row[2]  || '',
  category:         row[3]  || '',
  image1:           row[4]  || '',
  image2:           row[5]  || '',
  description:      row[6]  || '',
  customisable:     row[7]  || '',
  sizes:            row[8]  || '',
  label:            row[9]  || '',
  status:           row[10] || '',
  created_at:       row[11] || '',
  created_by:       row[12] || '',
  last_modified_at: row[13] || '',
  last_modified_by: row[14] || '',
}));
    // Only show live products
    products = products.filter(p => p.status === 'Live' || p.status === 'active');

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

    // Apply featured filter (label contains FEATURED)
    if (featured === true || featured === 'true') {
      products = products.filter(p =>
        p.label && p.label.toUpperCase().includes('FEATURED')
      );
    }

    // Apply search query
    if (query && query.trim() !== '') {
      const searchLower = query.toLowerCase().trim();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower) ||
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
