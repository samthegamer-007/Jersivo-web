const googleSheets = require('../server/googleSheets');

const ORDERS_EMAILS_DB_ID = process.env.ORDERS_EMAILS_SPREADSHEET_ID; // "Orders and Emails" spreadsheet

/**
 * Generate Order ID in format: DDMMYY-XXX
 * Example: 240324-001 (March 24, 2024, order #1 of the day)
 * Counter increments by 1 for each order (even if rejected)
 * Counter resets daily
 * @returns {Promise<string>} Generated order ID
 */
async function generateOrderID() {
  try {
    const now = new Date();
    
    // Format date as DDMMYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    
    const datePrefix = `${day}${month}${year}`;
    
    // Read all requests to find highest counter for today
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    
    let maxCounter = 0;
    
    requests.forEach(row => {
      const orderNo = row[0] || '';
      
      // Check if order is from today
      if (orderNo.startsWith(datePrefix + '-')) {
        const parts = orderNo.split('-');
        if (parts.length === 2) {
          const counter = parseInt(parts[1], 10);
          if (!isNaN(counter) && counter > maxCounter) {
            maxCounter = counter;
          }
        }
      }
    });
    
    // Increment counter by 1
    const nextCounter = maxCounter + 1;
    
    // Format with zero-padding (001, 002, etc.)
    const counterStr = String(nextCounter).padStart(3, '0');
    
    // Build Order ID
    const orderNo = `${datePrefix}-${counterStr}`;
    
    console.log(`✅ Generated Order No: ${orderNo}`);
    return orderNo;
    
  } catch (error) {
    console.error('Error generating Order No:', error);
    throw error;
  }
}

/**
 * Create order request (when customer clicks "Proceed to Instagram")
 * Writes to "requests" sheet with full order data
 * @param {Object} orderData - Order details from cart form
 * @returns {Promise<Object>} Result with order number
 */
async function createOrderRequest(orderData) {
  try {
    // Generate order number
    const orderNo = await generateOrderID();
    
    // Extract data from order
    const {
      name,
      email,
      phone,
      address,
      city,
      pincode,
      state,
      items,
      shipping,
      payment
    } = orderData;
    
    // Build location string
    const location = `${city}, ${state} - ${pincode}`;
    
    // Format items for storage (SKU_quantity format)
    const itemsString = items.map(item => `${item.sku}_${item.quantity}`).join('; ');
    
    // Write to "requests" sheet
    // Columns: order_no | status | location | payment | email | phone_no | money_received | items | shipping
    const row = [
      orderNo,
      'pending',
      location,
      payment,
      email || 'N/A',
      phone || 'N/A',
      '', // money_received (empty initially)
      itemsString,
      shipping
    ];
    
    await googleSheets.appendToSheet('requests', [row], ORDERS_EMAILS_DB_ID);
    
    console.log(`✅ Created order request: ${orderNo}`);
    
    return {
      success: true,
      orderNo,
      message: 'Order request created'
    };
    
  } catch (error) {
    console.error('Error creating order request:', error);
    throw error;
  }
}

/**
 * Get all pending order requests
 * @returns {Promise<Array>} Array of pending orders with details
 */
async function getPendingRequests() {
  try {
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    
    // Filter only "pending" status
    const pending = requests
      .filter(row => row[1] === 'pending')
      .map(row => ({
        orderNo: row[0],
        status: row[1],
        location: row[2],
        payment: row[3],
        email: row[4],
        phone: row[5],
        moneyReceived: row[6],
        items: row[7],
        shipping: row[8]
      }));
    
    return pending;
    
  } catch (error) {
    console.error('Error getting pending requests:', error);
    throw error;
  }
}

/**
 * Confirm order (when owner clicks "Confirm" in Owner Panel)
 * Updates "requests" status + writes to "confirmed" + adds to "customer_list"
 * @param {string} orderNo - Order number
 * @returns {Promise<Object>} Result
 */
async function confirmOrder(orderNo) {
  try {
    // 1. Get order from "requests" sheet
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    const requestIndex = requests.findIndex(row => row[0] === orderNo);
    
    if (requestIndex === -1) {
      throw new Error(`Order request not found: ${orderNo}`);
    }
    
    const orderRow = requests[requestIndex];
    
    // 2. Update "requests" sheet status to "confirmed"
    const updatedRequestRow = [
      orderRow[0], // order_no
      'confirmed', // status
      orderRow[2], // location
      orderRow[3], // payment
      orderRow[4], // email
      orderRow[5], // phone_no
      orderRow[6], // money_received
      orderRow[7], // items
      orderRow[8]  // shipping
    ];
    
    await googleSheets.updateRow('requests', requestIndex + 2, updatedRequestRow, ORDERS_EMAILS_DB_ID);
    console.log(`✅ Updated request status: ${orderNo} → confirmed`);
    
    // 3. Write to "confirmed" sheet (no status column)
    // Columns: order_no | location | payment | email | phone_no | money_received
    const confirmedRow = [
      orderRow[0], // order_no
      orderRow[2], // location
      orderRow[3], // payment
      orderRow[4], // email
      orderRow[5], // phone_no
      orderRow[6]  // money_received
    ];
    
    await googleSheets.appendToSheet('confirmed', [confirmedRow], ORDERS_EMAILS_DB_ID);
    console.log(`✅ Added to confirmed: ${orderNo}`);
    
    // 4. Add to "customer_list" (phone + email)
    await addToCustomerList(orderRow[5], orderRow[4]);
    
    return {
      success: true,
      message: 'Order confirmed successfully'
    };
    
  } catch (error) {
    console.error('Error confirming order:', error);
    throw error;
  }
}

/**
 * Reject order (when owner clicks "Reject" in Owner Panel)
 * Updates "requests" status to "rejected"
 * @param {string} orderNo - Order number
 * @returns {Promise<Object>} Result
 */
async function rejectOrder(orderNo) {
  try {
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    const requestIndex = requests.findIndex(row => row[0] === orderNo);
    
    if (requestIndex === -1) {
      throw new Error(`Order request not found: ${orderNo}`);
    }
    
    const orderRow = requests[requestIndex];
    
    // Update status to "rejected"
    const updatedRequestRow = [
      orderRow[0], // order_no
      'rejected',  // status
      orderRow[2], // location
      orderRow[3], // payment
      orderRow[4], // email
      orderRow[5], // phone_no
      orderRow[6], // money_received
      orderRow[7], // items
      orderRow[8]  // shipping
    ];
    
    await googleSheets.updateRow('requests', requestIndex + 2, updatedRequestRow, ORDERS_EMAILS_DB_ID);
    
    console.log(`✅ Rejected order: ${orderNo}`);
    
    return {
      success: true,
      message: 'Order rejected'
    };
    
  } catch (error) {
    console.error('Error rejecting order:', error);
    throw error;
  }
}

/**
 * Add customer to customer_list (no duplicates)
 * @param {string} phone - Phone number
 * @param {string} email - Email address
 * @returns {Promise<void>}
 */
async function addToCustomerList(phone, email) {
  try {
    // Read existing customer list
    const customerList = await googleSheets.readFromSheet('customer_list', ORDERS_EMAILS_DB_ID);
    
    // Check if customer already exists (by phone or email)
    const exists = customerList.some(row => 
      row[0] === phone || row[1] === email
    );
    
    if (exists) {
      console.log(`Customer already in list: ${phone} / ${email}`);
      return;
    }
    
    // Add new customer (phone_no, email)
    await googleSheets.appendToSheet('customer_list', [[phone, email]], ORDERS_EMAILS_DB_ID);
    console.log(`✅ Added to customer list: ${phone} / ${email}`);
    
  } catch (error) {
    console.error('Error adding to customer list:', error);
    throw error;
  }
}

/**
 * Get all confirmed orders
 * @returns {Promise<Array>} Array of confirmed orders
 */
async function getConfirmedOrders() {
  try {
    const confirmed = await googleSheets.readFromSheet('confirmed', ORDERS_EMAILS_DB_ID);
    
    return confirmed.map(row => ({
      orderNo: row[0],
      location: row[1],
      payment: row[2],
      email: row[3],
      phone: row[4],
      moneyReceived: row[5]
    }));
    
  } catch (error) {
    console.error('Error getting confirmed orders:', error);
    throw error;
  }
}

/**
 * Get customer list (for export/campaigns)
 * @returns {Promise<Array>} Array of customers with phone and email
 */
async function getCustomerList() {
  try {
    const customerList = await googleSheets.readFromSheet('customer_list', ORDERS_EMAILS_DB_ID);
    
    return customerList.map(row => ({
      phone: row[0],
      email: row[1]
    })).filter(c => c.phone || c.email);
    
  } catch (error) {
    console.error('Error getting customer list:', error);
    throw error;
  }
}

/**
 * Get all orders (pending + confirmed + rejected)
 * @returns {Promise<Array>} Array of all orders
 */
async function getAllOrders() {
  try {
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    
    return requests.map(row => ({
      orderNo: row[0],
      status: row[1],
      location: row[2],
      payment: row[3],
      email: row[4],
      phone: row[5],
      moneyReceived: row[6],
      items: row[7],
      shipping: row[8]
    }));
    
  } catch (error) {
    console.error('Error getting all orders:', error);
    throw error;
  }
}

/**
 * Get order statistics
 * @returns {Promise<Object>} Stats
 */
async function getOrderStats() {
  try {
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    const customerList = await googleSheets.readFromSheet('customer_list', ORDERS_EMAILS_DB_ID);
    
    const stats = {
      totalRequests: requests.length,
      pending: requests.filter(row => row[1] === 'pending').length,
      confirmed: requests.filter(row => row[1] === 'confirmed').length,
      rejected: requests.filter(row => row[1] === 'rejected').length,
      uniqueCustomers: customerList.length,
      conversionRate: requests.length > 0 
        ? ((requests.filter(row => row[1] === 'confirmed').length / requests.length) * 100).toFixed(2) + '%'
        : '0%'
    };
    
    return stats;
    
  } catch (error) {
    console.error('Error getting order stats:', error);
    throw error;
  }
}

module.exports = {
  generateOrderID,
  createOrderRequest,
  getPendingRequests,
  confirmOrder,
  rejectOrder,
  addToCustomerList,
  getConfirmedOrders,
  getCustomerList,
  getAllOrders,
  getOrderStats
};
