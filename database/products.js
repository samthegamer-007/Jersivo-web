const googleSheets = require('../server/googleSheets');
const { generateSKU, getSheetForCategory, getDisplayCategory, updateSKUStatus } = require('./sku');

const PRODUCTS_DB_ID = process.env.SPREADSHEET_ID;

/**
 * Add new product
 * Writes to: Sheet1 (15 cols) + Category sheet (9 cols) + Product ID Management
 */
async function addProduct(productData, username) {
  try {
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
    } = productData;

    // Generate SKU
    const sku = await generateSKU(category, teamCode);
    
    const timestamp = new Date().toISOString();
    
    // Prepare data for Sheet1 (15 columns)
    const globalRow = [
      sku,                    // id
      name,                   // name
      price,                  // price
      getDisplayCategory(category), // category
      image1 || '',           // image1
      image2 || '',           // image2
      description || '',      // description
      customisable || 'No',   // customisable
      sizes || '',            // sizes
      label || '',            // label
      'Live',                 // status
      timestamp,              // created_at
      username,               // created_by
      timestamp,              // last_modified_at
      username                // last_modified_by
    ];
    
    // Write to Sheet1
    await googleSheets.appendToSheet('Sheet1', [globalRow], PRODUCTS_DB_ID);
    console.log(`✅ Added to Sheet1: ${sku}`);
    
    // Prepare data for category sheet (9 columns)
    const categoryRow = [
      sku,                    // id
      name,                   // name
      price,                  // price
      image1 || '',           // image1
      image2 || '',           // image2
      description || '',      // description
      customisable || 'No',   // customisable
      sizes || '',            // sizes
      label || ''             // label
    ];
    
    // Write to category-specific sheet
    const categorySheet = getSheetForCategory(category);
    await googleSheets.appendToSheet(categorySheet, [categoryRow], PRODUCTS_DB_ID);
    console.log(`✅ Added to ${categorySheet}: ${sku}`);
    
    return {
      success: true,
      sku,
      message: 'Product added successfully'
    };
    
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

/**
 * Update existing product
 * Updates: Sheet1 + Category sheet
 * Handles status changes (restoring deleted products)
 */
async function updateProduct(sku, updates, username) {
  try {
    // Read Sheet1 to find the product
    const globalProducts = await googleSheets.readFromSheet('Sheet1', PRODUCTS_DB_ID);
    const productIndex = globalProducts.findIndex(row => row[0] === sku);
    
    if (productIndex === -1) {
      throw new Error(`Product not found: ${sku}`);
    }
    
    const existingProduct = globalProducts[productIndex];
    const category = existingProduct[3]; // category column
    const oldStatus = existingProduct[10]; // current status
    
    const timestamp = new Date().toISOString();
    
    // Update Sheet1 (update allowed columns)
    const globalUpdates = {
      name: updates.name || existingProduct[1],
      price: updates.price || existingProduct[2],
      image1: updates.image1 !== undefined ? updates.image1 : existingProduct[4],
      image2: updates.image2 !== undefined ? updates.image2 : existingProduct[5],
      description: updates.description !== undefined ? updates.description : existingProduct[6],
      customisable: updates.customisable || existingProduct[7],
      sizes: updates.sizes !== undefined ? updates.sizes : existingProduct[8],
      label: updates.label !== undefined ? updates.label : existingProduct[9],
      status: updates.status || existingProduct[10], // Allow status changes!
      last_modified_at: timestamp,
      last_modified_by: username
    };
    
    // Build updated Sheet1 row
    const globalRow = [
      sku,                              // id (unchanged)
      globalUpdates.name,               // name
      globalUpdates.price,              // price
      category,                         // category (unchanged)
      globalUpdates.image1,             // image1
      globalUpdates.image2,             // image2
      globalUpdates.description,        // description
      globalUpdates.customisable,       // customisable
      globalUpdates.sizes,              // sizes
      globalUpdates.label,              // label
      globalUpdates.status,             // status (can be updated now!)
      existingProduct[11],              // created_at (unchanged)
      existingProduct[12],              // created_by (unchanged)
      globalUpdates.last_modified_at,   // last_modified_at
      globalUpdates.last_modified_by    // last_modified_by
    ];
    
    // Update Sheet1
    await googleSheets.updateRow('Sheet1', productIndex + 2, globalRow, PRODUCTS_DB_ID);
    console.log(`✅ Updated Sheet1: ${sku}`);
    
    // Handle category sheet based on status change
    const categorySheet = getSheetForCategory(category);
    const categoryProducts = await googleSheets.readFromSheet(categorySheet, PRODUCTS_DB_ID);
    const categoryIndex = categoryProducts.findIndex(row => row[0] === sku);
    
    const newStatus = globalUpdates.status;
    
    // If status changed from "Deleted" to "Live", re-add to category sheet
    if (oldStatus === 'Deleted' && newStatus === 'Live') {
      if (categoryIndex === -1) {
        // Product not in category sheet, add it back
        const categoryRow = [
          sku,                          // id
          globalUpdates.name,           // name
          globalUpdates.price,          // price
          globalUpdates.image1,         // image1
          globalUpdates.image2,         // image2
          globalUpdates.description,    // description
          globalUpdates.customisable,   // customisable
          globalUpdates.sizes,          // sizes
          globalUpdates.label           // label
        ];
        
        await googleSheets.appendToSheet(categorySheet, [categoryRow], PRODUCTS_DB_ID);
        console.log(`✅ Restored to ${categorySheet}: ${sku}`);
      } else {
        // Already exists in category sheet, just update it
        const categoryRow = [
          sku,
          globalUpdates.name,
          globalUpdates.price,
          globalUpdates.image1,
          globalUpdates.image2,
          globalUpdates.description,
          globalUpdates.customisable,
          globalUpdates.sizes,
          globalUpdates.label
        ];
        
        await googleSheets.updateRow(categorySheet, categoryIndex + 2, categoryRow, PRODUCTS_DB_ID);
        console.log(`✅ Updated ${categorySheet}: ${sku}`);
      }
    } 
    // If product is Live and exists in category sheet, update it
    else if (newStatus === 'Live' && categoryIndex !== -1) {
      const categoryRow = [
        sku,
        globalUpdates.name,
        globalUpdates.price,
        globalUpdates.image1,
        globalUpdates.image2,
        globalUpdates.description,
        globalUpdates.customisable,
        globalUpdates.sizes,
        globalUpdates.label
      ];
      
      await googleSheets.updateRow(categorySheet, categoryIndex + 2, categoryRow, PRODUCTS_DB_ID);
      console.log(`✅ Updated ${categorySheet}: ${sku}`);
    }
    
    return {
      success: true,
      message: 'Product updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete product (soft delete)
 * Updates Sheet1 status to "Deleted", removes from category sheet, updates SKU status
 */
async function deleteProduct(sku, username) {
  try {
    // Read Sheet1
    const globalProducts = await googleSheets.readFromSheet('Sheet1', PRODUCTS_DB_ID);
    const productIndex = globalProducts.findIndex(row => row[0] === sku);
    
    if (productIndex === -1) {
      throw new Error(`Product not found: ${sku}`);
    }
    
    const existingProduct = globalProducts[productIndex];
    const category = existingProduct[3];
    const timestamp = new Date().toISOString();
    
    // Update Sheet1 status to "Deleted"
    const globalRow = [...existingProduct];
    globalRow[10] = 'Deleted'; // status
    globalRow[13] = timestamp; // last_modified_at
    globalRow[14] = username;  // last_modified_by
    
    await googleSheets.updateRow('Sheet1', productIndex + 2, globalRow, PRODUCTS_DB_ID);
    console.log(`✅ Marked as deleted in Sheet1: ${sku}`);
    
    // Remove from category sheet
    const categorySheet = getSheetForCategory(category);
    const categoryProducts = await googleSheets.readFromSheet(categorySheet, PRODUCTS_DB_ID);
    const categoryIndex = categoryProducts.findIndex(row => row[0] === sku);
    
    if (categoryIndex !== -1) {
      await googleSheets.deleteRow(categorySheet, categoryIndex + 2, PRODUCTS_DB_ID);
      console.log(`✅ Removed from ${categorySheet}: ${sku}`);
    }
    
    // Update SKU status in Product ID Management
    await updateSKUStatus(sku, 'Deleted');
    
    return {
      success: true,
      message: 'Product deleted successfully'
    };
    
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Get all products from Sheet1 (for admin panel)
 */
async function getAllProducts() {
  try {
    const products = await googleSheets.readFromSheet('Sheet1', PRODUCTS_DB_ID);
    
    // Convert to objects
    return products.map(row => ({
      id: row[0],
      name: row[1],
      price: row[2],
      category: row[3],
      image1: row[4],
      image2: row[5],
      description: row[6],
      customisable: row[7],
      sizes: row[8],
      label: row[9],
      status: row[10],
      created_at: row[11],
      created_by: row[12],
      last_modified_at: row[13],
      last_modified_by: row[14]
    }));
    
  } catch (error) {
    console.error('Error getting all products:', error);
    throw error;
  }
}

/**
 * Get products by category (for customer browsing)
 */
async function getProductsByCategory(category) {
  try {
    const categorySheet = getSheetForCategory(category);
    const products = await googleSheets.readFromSheet(categorySheet, PRODUCTS_DB_ID);
    
    // Convert to objects (9 columns)
    return products.map(row => ({
      id: row[0],
      name: row[1],
      price: row[2],
      image1: row[3],
      image2: row[4],
      description: row[5],
      customisable: row[6],
      sizes: row[7],
      label: row[8]
    }));
    
  } catch (error) {
    console.error('Error getting products by category:', error);
    throw error;
  }
}

module.exports = {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductsByCategory
};
