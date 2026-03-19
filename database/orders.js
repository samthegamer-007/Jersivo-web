const googleSheets = require('../server/googleSheets');

const ORDERS_EMAILS_DB_ID = process.env.ORDERS_EMAILS_SPREADSHEET_ID; // "Orders and Emails" spreadsheet

/**
 * Generate Order ID in format: DDMMYY-XXX
 * Example: 240324-001 (March 24, 2024, order #1 of the day)
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
    
    // Increment counter
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
 * Writes to "requests" sheet only
 * @param {string} orderNo - Generated order number
 * @returns {Promise<Object>} Result
 */
async function createOrderRequest(orderNo) {
  try {
    // Write to "requests" sheet (2 columns: order_no, status)
    const row = [orderNo, 'Pending'];
    
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
 * @returns {Promise<Array>} Array of pending order numbers
 */
async function getPendingRequests() {
  try {
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    
    // Filter only "Pending" status
    const pending = requests
      .filter(row => row[1] === 'Pending')
      .map(row => ({
        orderNo: row[0],
        status: row[1]
      }));
    
    return pending;
    
  } catch (error) {
    console.error('Error getting pending requests:', error);
    throw error;
  }
}

/**
 * Confirm order (when admin clicks "Confirm" in Owner Panel)
 * Updates "requests" status + writes to "confirmed" + adds to "email_list"
 * @param {string} orderNo - Order number
 * @param {Object} orderDetails - Order details from admin
 * @returns {Promise<Object>} Result
 */
async function confirmOrder(orderNo, orderDetails) {
  try {
    const { state, pincode, payment, email } = orderDetails;
    
    // 1. Update "requests" sheet status to "Confirmed"
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    const requestIndex = requests.findIndex(row => row[0] === orderNo);
    
    if (requestIndex === -1) {
      throw new Error(`Order request not found: ${orderNo}`);
    }
    
    const updatedRequestRow = [orderNo, 'Confirmed'];
    await googleSheets.updateRow('requests', requestIndex + 2, updatedRequestRow, ORDERS_EMAILS_DB_ID);
    console.log(`✅ Updated request status: ${orderNo} → Confirmed`);
    
    // 2. Write to "confirmed" sheet (4 columns: order_no, location, payment, email)
    const location = `${state} - ${pincode}`;
    const confirmedRow = [orderNo, location, payment, email];
    await googleSheets.appendToSheet('confirmed', [confirmedRow], ORDERS_EMAILS_DB_ID);
    console.log(`✅ Added to confirmed: ${orderNo}`);
    
    // 3. Add email to "email_list" (if not exists)
    await addToEmailList(email);
    
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
 * Reject order (when admin clicks "Reject" in Owner Panel)
 * Updates "requests" status to "Rejected"
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
    
    const updatedRequestRow = [orderNo, 'Rejected'];
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
 * Add email to email_list (no duplicates)
 * @param {string} email - Email address
 * @returns {Promise<void>}
 */
async function addToEmailList(email) {
  try {
    // Read existing email list
    const emailList = await googleSheets.readFromSheet('email_list', ORDERS_EMAILS_DB_ID);
    
    // Check if email already exists
    const exists = emailList.some(row => row[0] === email);
    
    if (exists) {
      console.log(`Email already in list: ${email}`);
      return;
    }
    
    // Add new email
    await googleSheets.appendToSheet('email_list', [[email]], ORDERS_EMAILS_DB_ID);
    console.log(`✅ Added to email list: ${email}`);
    
  } catch (error) {
    console.error('Error adding to email list:', error);
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
      email: row[3]
    }));
    
  } catch (error) {
    console.error('Error getting confirmed orders:', error);
    throw error;
  }
}

/**
 * Get email list (for export/campaigns)
 * @returns {Promise<Array>} Array of unique emails
 */
async function getEmailList() {
  try {
    const emailList = await googleSheets.readFromSheet('email_list', ORDERS_EMAILS_DB_ID);
    
    return emailList.map(row => row[0]).filter(Boolean);
    
  } catch (error) {
    console.error('Error getting email list:', error);
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
    const confirmed = await googleSheets.readFromSheet('confirmed', ORDERS_EMAILS_DB_ID);
    const emailList = await googleSheets.readFromSheet('email_list', ORDERS_EMAILS_DB_ID);
    
    const stats = {
      totalRequests: requests.length,
      pending: requests.filter(row => row[1] === 'Pending').length,
      confirmedCount: requests.filter(row => row[1] === 'Confirmed').length,
      rejected: requests.filter(row => row[1] === 'Rejected').length,
      totalRevenue: confirmed.reduce((sum, row) => sum + parseFloat(row[2] || 0), 0),
      uniqueCustomers: emailList.length,
      conversionRate: requests.length > 0 
        ? ((confirmed.length / requests.length) * 100).toFixed(2) + '%'
        : '0%'
    };
    
    return stats;
    
  } catch (error) {
    console.error('Error getting order stats:', error);
    throw error;
  }
}

/**
 * Cleanup old rejected requests (optional - run manually or cron)
 * Deletes rejected requests older than 7 days
 * @returns {Promise<Object>} Result
 */
async function cleanupOldRejected() {
  try {
    const requests = await googleSheets.readFromSheet('requests', ORDERS_EMAILS_DB_ID);
    
    let deletedCount = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Find rejected orders older than 7 days
    // Note: We'd need to add timestamp to requests sheet to do this properly
    // For now, just delete ALL rejected orders
    
    for (let i = requests.length - 1; i >= 0; i--) {
      if (requests[i][1] === 'Rejected') {
        // Delete row (i + 2 because: array index + 1 for header + 1 for sheet rows)
        await googleSheets.deleteRow('requests', i + 2, ORDERS_EMAILS_DB_ID);
        deletedCount++;
      }
    }
    
    console.log(`✅ Cleaned up ${deletedCount} rejected requests`);
    
    return {
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} rejected requests`
    };
    
  } catch (error) {
    console.error('Error cleaning up rejected requests:', error);
    throw error;
  }
}

module.exports = {
  generateOrderID,
  createOrderRequest,
  getPendingRequests,
  confirmOrder,
  rejectOrder,
  addToEmailList,
  getConfirmedOrders,
  getEmailList,
  getOrderStats,
  cleanupOldRejected
};
