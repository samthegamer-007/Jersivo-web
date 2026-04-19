// database/products.js
// CRUD for Products sheet
// Column mapping:
// A(0)=sku  B(1)=name  C(2)=category  D(3)=team
// E(4)=price  F(5)=image1  G(6)=image2  H(7)=sizes(JSON)  I(8)=status

const { readFromSheet, appendToSheet, updateRow, readRowsWithIndex } = require('../server/googleSheets');

const SHEET_NAME = 'Products';
const SHEET_ID = () => process.env.GOOGLE_SHEET_ID_PRODUCTS;

// Column indices
const COL = { SKU:0, NAME:1, CATEGORY:2, TEAM:3, PRICE:4, IMAGE1:5, IMAGE2:6, SIZES:7, STATUS:8 };

function rowToProduct(row) {
  return {
    sku:      row[COL.SKU]      || '',
    name:     row[COL.NAME]     || '',
    category: row[COL.CATEGORY] || '',
    team:     row[COL.TEAM]     || '',
    price:    parseFloat(row[COL.PRICE]) || 0,
    image1:   row[COL.IMAGE1]   || '',
    image2:   row[COL.IMAGE2]   || '',
    sizes:    (() => { try { return JSON.parse(row[COL.SIZES] || '[]'); } catch { return []; } })(),
    status:   row[COL.STATUS]   || 'LIVE',
  };
}

function productToRow(p) {
  return [
    p.sku, p.name, p.category, p.team,
    p.price, p.image1, p.image2,
    JSON.stringify(p.sizes),
    p.status || 'LIVE'
  ];
}

// SKU prefix map
const CATEGORY_PREFIX = {
  'Club Jersey': 'CJ',
  'Retro Club Jersey': 'CR',
  'National Team Jersey': 'NT',
  'Retro National Team Jersey': 'NR',
  'Special Edition Jersey': 'SE',
};

const TEAM_CODE = {
  'Manchester City':'MCT','Manchester United':'MUN','Barcelona':'FCB',
  'Real Madrid':'RMA','Atletico Madrid':'ATM','Inter Milan':'ITM',
  'AC Milan':'ACM','Dortmund':'DOR','Bayern Munich':'BAY','Juventus':'JVT',
  'PSG':'PSG','Liverpool':'LVP','Arsenal':'ARS','Chelsea':'CLS',
  'Inter Miami':'IMI','Germany':'GER','Spain':'SPN','Argentina':'ARG',
  'Portugal':'PTG','Brazil':'BRA','England':'ENG','France':'FRA',
};

/**
 * Generate next SKU for a category+team combo.
 * Format: XY-000-ABC  e.g. CJ-001-FCB
 * SKUs are permanent — counter never resets even if products are deleted.
 */
async function generateSKU(category, team) {
  const prefix = CATEGORY_PREFIX[category] || 'XX';
  const teamCode = TEAM_CODE[team] || 'UNK';
  const rows = await readFromSheet(SHEET_NAME, SHEET_ID());
  // Find all existing SKUs matching this prefix+teamCode
  const pattern = new RegExp(`^${prefix}-\\d{3}-${teamCode}$`);
  const matches = rows.filter(r => pattern.test(r[COL.SKU] || ''));
  const next = matches.length + 1;
  return `${prefix}-${String(next).padStart(3,'0')}-${teamCode}`;
}

async function getAllProducts() {
  const rows = await readFromSheet(SHEET_NAME, SHEET_ID());
  return rows.filter(r => r[COL.SKU]).map(rowToProduct);
}

async function getLiveProducts() {
  const all = await getAllProducts();
  return all.filter(p => p.status === 'LIVE');
}

async function addProduct(productData) {
  const sku = await generateSKU(productData.category, productData.team);
  const product = { ...productData, sku, status: 'LIVE' };
  await appendToSheet(SHEET_NAME, SHEET_ID(), productToRow(product));
  return product;
}

async function updateProduct(sku, updates) {
  const rows = await readRowsWithIndex(SHEET_NAME, SHEET_ID());
  const entry = rows.find(r => r.data[COL.SKU] === sku);
  if (!entry) throw new Error(`Product ${sku} not found`);
  const current = rowToProduct(entry.data);
  const updated = { ...current, ...updates, sku }; // sku is immutable
  await updateRow(SHEET_NAME, SHEET_ID(), entry.rowIndex, productToRow(updated));
  return updated;
}

async function deleteProduct(sku) {
  return updateProduct(sku, { status: 'DELETED' });
}

module.exports = { getAllProducts, getLiveProducts, addProduct, updateProduct, deleteProduct, generateSKU, CATEGORY_PREFIX, TEAM_CODE };
