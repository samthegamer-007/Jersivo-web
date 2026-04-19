// database/orders.js
// Generates order numbers only — no sheet storage.

function generateOrderNo() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const xyz = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${dd}${mm}${yy}-${xyz}`;
}

async function createOrder() {
  return { order_no: generateOrderNo() };
}

module.exports = { createOrder };
