const express = require('express');
const router = express.Router();
const {
  generateOrderID,
  createOrderRequest,
  getPendingRequests,
  confirmOrder,
  rejectOrder,
  getConfirmedOrders,
  getEmailList,
  getOrderStats,
  cleanupOldRejected
} = require('../../database/orders');

// Middleware to check owner authentication
function requireOwner(req, res, next) {
  if (!req.session || !req.session.role || req.session.role !== 'owner') {
    return res.status(401).json({ error: 'Unauthorized - Owner access required' });
  }
  next();
}

/**
 * POST /api/orders/create-request
 * Create order request when customer clicks "Proceed to Instagram"
 * Public endpoint (no auth required)
 */
router.post('/create-request', async (req, res) => {
  try {
    const { cart, customerDetails, total, paymentMethod } = req.body;
    
    // Generate Order ID
    const orderNo = await generateOrderID();
    
    // Create request in "requests" sheet
    await createOrderRequest(orderNo);
    
    // Build pre-filled Instagram DM message
    const { name, phone, email, address, city, state, pincode } = customerDetails;
    
    // Format cart items
    const itemsText = cart.map((item, index) => {
      let itemLine = `${index + 1}) ${item.size}_${item.sku}_${item.quantity}`;
      if (item.customization) {
        itemLine += `\n   ${item.customization}`;
      }
      return itemLine;
    }).join('\n\n');
    
    // Build full message
    const dmMessage = `==============================
Order No. - ${orderNo}

Name - ${name}
Phone - ${phone || 'N/A'}
Email address - ${email}
Full address - ${address}, ${city}
Pin code - ${pincode}
State - ${state}

Items-
${itemsText}

Payment option - ${paymentMethod}${paymentMethod === 'COD' ? ' (+₹49)' : ''}

Ready to pay
==============================`;

    res.json({
      success: true,
      orderNo,
      dmMessage,
      message: 'Order request created'
    });
    
  } catch (error) {
    console.error('Error creating order request:', error);
    res.status(500).json({ error: 'Failed to create order request' });
  }
});

/**
 * GET /api/owner/orders/pending
 * Get all pending order requests (for Owner Panel)
 * Requires owner authentication
 */
router.get('/pending', requireOwner, async (req, res) => {
  try {
    const pending = await getPendingRequests();
    
    res.json({
      success: true,
      orders: pending,
      count: pending.length
    });
    
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
});

/**
 * POST /api/owner/orders/confirm
 * Confirm order (move from pending to confirmed)
 * Requires owner authentication
 */
router.post('/confirm', requireOwner, async (req, res) => {
  try {
    const { orderNo, state, pincode, payment, email } = req.body;
    
    if (!orderNo || !state || !pincode || !payment || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const orderDetails = { state, pincode, payment, email };
    
    const result = await confirmOrder(orderNo, orderDetails);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

/**
 * POST /api/owner/orders/reject
 * Reject order request
 * Requires owner authentication
 */
router.post('/reject', requireOwner, async (req, res) => {
  try {
    const { orderNo } = req.body;
    
    if (!orderNo) {
      return res.status(400).json({ error: 'Order number required' });
    }
    
    const result = await rejectOrder(orderNo);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

/**
 * GET /api/owner/orders/confirmed
 * Get all confirmed orders
 * Requires owner authentication
 */
router.get('/confirmed', requireOwner, async (req, res) => {
  try {
    const confirmed = await getConfirmedOrders();
    
    res.json({
      success: true,
      orders: confirmed,
      count: confirmed.length
    });
    
  } catch (error) {
    console.error('Error getting confirmed orders:', error);
    res.status(500).json({ error: 'Failed to get confirmed orders' });
  }
});

/**
 * GET /api/owner/orders/emails
 * Get email list (for export)
 * Requires owner authentication
 */
router.get('/emails', requireOwner, async (req, res) => {
  try {
    const emails = await getEmailList();
    
    res.json({
      success: true,
      emails,
      count: emails.length
    });
    
  } catch (error) {
    console.error('Error getting email list:', error);
    res.status(500).json({ error: 'Failed to get email list' });
  }
});

/**
 * GET /api/owner/orders/stats
 * Get order statistics (for dashboard)
 * Requires owner authentication
 */
router.get('/stats', requireOwner, async (req, res) => {
  try {
    const stats = await getOrderStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({ error: 'Failed to get order stats' });
  }
});

/**
 * POST /api/owner/orders/cleanup
 * Cleanup old rejected requests
 * Requires owner authentication
 */
router.post('/cleanup', requireOwner, async (req, res) => {
  try {
    const result = await cleanupOldRejected();
    
    res.json(result);
    
  } catch (error) {
    console.error('Error cleaning up rejected requests:', error);
    res.status(500).json({ error: 'Failed to cleanup rejected requests' });
  }
});

module.exports = router;
