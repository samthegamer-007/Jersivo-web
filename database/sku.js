const googleSheets = require('../server/googleSheets');

// Spreadsheet IDs
const PRODUCTS_DB_ID = process.env.GOOGLE_SHEET_ID_PRODUCTS; // Jersivo Products Database
const PRODUCTS_ID_MGMT_ID = process.env.PRODUCTS_ID_MANAGEMENT_SPREADSHEET_ID; // Products ID Management

// Category to prefix mapping
const CATEGORY_PREFIX_MAP = {
  'Club jerseys': 'C',
  'National team jerseys': 'N',
  'Special jerseys': 'S',
  'Retro jerseys': 'R',
  'Other apparel': 'O',
  'Gifts': 'G'
};

// Category to sheet name mapping
const CATEGORY_SHEET_MAP = {
  'Club jerseys': 'Club jerseys',
  'National team jerseys': 'National team jerseys',
  'Special jerseys': 'Special jerseys',
  'Retro jerseys': 'Retro jerseys',
  'Other apparel': 'Other apparel',
  'Gifts': 'Gifts'
};

/**
 * Generate SKU for a product
 * @param {string} category - Product category
 * @param {string} teamCode - Team/club code (e.g., FCB, RMA)
 * @returns {Promise<string>} Generated SKU (e.g., C-001-FCB)
 */
async function generateSKU(category, teamCode) {
  try {
    // Get prefix for this category
    const prefix = CATEGORY_PREFIX_MAP[category];
    if (!prefix) {
      throw new Error(`Unknown category: ${category}`);
    }

    // Get sheet name for this category
    const sheetName = CATEGORY_SHEET_MAP[category];
    if (!sheetName) {
      throw new Error(`No sheet mapping for category: ${category}`);
    }

    // Read all products from the category sheet
    const products = await googleSheets.readFromSheet(sheetName, PRODUCTS_DB_ID);
    
    // Find highest counter for this prefix
    let maxCounter = 0;
    
    products.forEach(row => {
      // SKU is in first column (index 0)
      const sku = row[0] || '';
      
      // Check if SKU starts with our prefix
      if (sku.startsWith(prefix + '-')) {
        // Extract number (e.g., "C-005-FCB" → "005")
        const parts = sku.split('-');
        if (parts.length >= 2) {
          const counter = parseInt(parts[1], 10);
          if (!isNaN(counter) && counter > maxCounter) {
            maxCounter = counter;
          }
        }
      }
    });
    
    // Increment counter
    const nextCounter = maxCounter + 1;
    
    // Format with zero-padding (001, 002, etc.)
    const counterStr = String(nextCounter).padStart(3, '0');
    
    // Build SKU
    const sku = `${prefix}-${counterStr}-${teamCode}`;
    
    // Record in Products ID Management spreadsheet
    await googleSheets.appendToSheet('Sheet1', [
      [sku, 'Live', 'N/A']
    ], PRODUCTS_ID_MGMT_ID);
    
    console.log(`✅ Generated SKU: ${sku}`);
    return sku;
    
  } catch (error) {
    console.error('Error generating SKU:', error);
    throw error;
  }
}

/**
 * Get sheet name for a category
 * @param {string} category - Product category
 * @returns {string} Sheet name
 */
function getSheetForCategory(category) {
  return CATEGORY_SHEET_MAP[category];
}

/**
 * Get display category name
 * @param {string} category - Internal category name
 * @returns {string} Display category name
 */
function getDisplayCategory(category) {
  return category;
}

/**
 * Update SKU status in Product ID Management
 * @param {string} sku - SKU to update
 * @param {string} status - New status (Live/Deleted)
 */
async function updateSKUStatus(sku, status) {
  try {
    // Read all records from Product ID Management
    const records = await googleSheets.readFromSheet('Sheet1', PRODUCTS_ID_MGMT_ID);
    
    // Find the row with matching SKU
    const rowIndex = records.findIndex(row => row[0] === sku);
    
    if (rowIndex === -1) {
      console.warn(`SKU not found in Product ID Management: ${sku}`);
      return;
    }
    
    // Update status (column B, index 1)
    // Note: Row index is 0-based in array, but 1-based in sheet (+ 1 for header)
    await googleSheets.updateCell('Sheet1', rowIndex + 2, 2, status, PRODUCTS_ID_MGMT_ID);
    
    console.log(`✅ Updated SKU ${sku} status to: ${status}`);
    
  } catch (error) {
    console.error('Error updating SKU status:', error);
    throw error;
  }
}

module.exports = {
  generateSKU,
  getSheetForCategory,
  getDisplayCategory,
  updateSKUStatus,
  CATEGORY_PREFIX_MAP,
  CATEGORY_SHEET_MAP
};
