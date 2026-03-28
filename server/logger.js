const googleSheets = require('./googleSheets');

// ============================================
// DEVICE NAME PARSER
// ============================================

/**
 * Parse user agent to friendly device name
 * @param {string} userAgent - Raw user agent string
 * @returns {string} - Friendly device name
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return 'Unknown Device';
  
  const ua = userAgent.toLowerCase();
  
  // Samsung devices
  if (ua.includes('samsung')) {
    // Extract model number (e.g., SM-G991B)
    const modelMatch = ua.match(/sm-[a-z0-9]+/i);
    if (modelMatch) {
      const model = modelMatch[0].toUpperCase();
      // Common Samsung models
      if (model.includes('SM-G99')) return `Samsung Galaxy S21 (${model})`;
      if (model.includes('SM-G98')) return `Samsung Galaxy S20 (${model})`;
      if (model.includes('SM-G97')) return `Samsung Galaxy S10 (${model})`;
      if (model.includes('SM-A')) return `Samsung Galaxy A-Series (${model})`;
      if (model.includes('SM-M')) return `Samsung Galaxy M-Series (${model})`;
      if (model.includes('SM-T')) return `Samsung Tablet (${model})`;
      return `Samsung ${model}`;
    }
    return 'Samsung Device';
  }
  
  // Oppo devices
  if (ua.includes('oppo')) {
    const modelMatch = ua.match(/oppo\s+([a-z0-9]+)/i);
    if (modelMatch) {
      return `Oppo ${modelMatch[1].toUpperCase()}`;
    }
    return 'Oppo Phone';
  }
  
  // Xiaomi/Redmi devices
  if (ua.includes('xiaomi') || ua.includes('redmi')) {
    const modelMatch = ua.match(/(redmi|mi)\s+([a-z0-9\s]+)/i);
    if (modelMatch) {
      return `Xiaomi ${modelMatch[0].toUpperCase()}`;
    }
    if (ua.includes('redmi')) return 'Xiaomi Redmi';
    return 'Xiaomi Phone';
  }
  
  // Vivo devices
  if (ua.includes('vivo')) {
    const modelMatch = ua.match(/vivo\s+([a-z0-9]+)/i);
    if (modelMatch) {
      return `Vivo ${modelMatch[1].toUpperCase()}`;
    }
    return 'Vivo Phone';
  }
  
  // Realme devices
  if (ua.includes('realme')) {
    const modelMatch = ua.match(/realme\s+([a-z0-9\s]+)/i);
    if (modelMatch) {
      return `Realme ${modelMatch[1].toUpperCase()}`;
    }
    return 'Realme Phone';
  }
  
  // OnePlus devices
  if (ua.includes('oneplus')) {
    const modelMatch = ua.match(/oneplus\s+([a-z0-9]+)/i);
    if (modelMatch) {
      return `OnePlus ${modelMatch[1].toUpperCase()}`;
    }
    return 'OnePlus Phone';
  }
  
  // Apple devices
  if (ua.includes('iphone')) {
    if (ua.includes('iphone14')) return 'iPhone 14';
    if (ua.includes('iphone13')) return 'iPhone 13';
    if (ua.includes('iphone12')) return 'iPhone 12';
    if (ua.includes('iphone11')) return 'iPhone 11';
    return 'iPhone';
  }
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'Mac';
  
  // Google Pixel
  if (ua.includes('pixel')) {
    const modelMatch = ua.match(/pixel\s+([0-9]+)/i);
    if (modelMatch) {
      return `Google Pixel ${modelMatch[1]}`;
    }
    return 'Google Pixel';
  }
  
  // Desktop browsers
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('linux') && !ua.includes('android')) return 'Linux PC';
  
  // Tablets
  if (ua.includes('tablet')) return 'Tablet';
  
  // Generic mobile
  if (ua.includes('mobile') || ua.includes('android')) return 'Android Phone';
  
  return 'Unknown Device';
}

/**
 * Log user authentication (login/logout)
 * @param {string} action - LOGIN, LOGOUT, AUTO_LOGOUT
 * @param {Object} user - User object
 * @param {Object} req - Express request object
 */
async function logAuthentication(action, user, req) {
  try {
    await googleSheets.writeLog('Authentication', {
      timestamp: new Date().toISOString(),
      admin_id: user.username,
      admin_name: user.name,
      action: action,
      ip: req ? (req.ip || req.connection.remoteAddress) : 'System',
      user_agent: req ? parseUserAgent(req.get('user-agent')) : 'System',
    });
  } catch (error) {
    console.error('Error logging authentication:', error);
  }
}

/**
 * Log product action (add/edit/delete request)
 * @param {string} action - PRODUCT_ADD, PRODUCT_EDIT, DELETE_REQUEST
 * @param {Object} user - User object
 * @param {string} productId - Product ID
 * @param {string} details - Additional details
 */
async function logProductAction(action, user, productId, details) {
  try {
    await googleSheets.writeLog('Product Actions', {
      timestamp: new Date().toISOString(),
      admin_id: user.username,
      admin_name: user.name,
      action: action,
      product_id: productId,
      details: details,
    });
  } catch (error) {
    console.error('Error logging product action:', error);
  }
}

/**
 * Log owner action (approve/deny delete, admin management)
 * @param {string} action - DELETE_APPROVED, DELETE_DENIED, ADMIN_ADDED, etc.
 * @param {string} details - Details about the action
 * @param {string} affectedItem - What was affected (product ID, admin username, etc.)
 */
async function logOwnerAction(action, details, affectedItem) {
  try {
    await googleSheets.writeLog('Owner Actions', {
      timestamp: new Date().toISOString(),
      action: action,
      details: details,
      affected_item: affectedItem,
    });
  } catch (error) {
    console.error('Error logging owner action:', error);
  }
}

/**
 * Log admin addition
 * @param {string} ownerUsername - Owner who added the admin
 * @param {string} newAdminUsername - New admin's username
 */
async function logAdminAdded(ownerUsername, newAdminUsername) {
  await logOwnerAction(
    'ADMIN_ADDED',
    `Owner ${ownerUsername} added new admin`,
    newAdminUsername
  );
}

/**
 * Log admin removal
 * @param {string} ownerUsername - Owner who removed the admin
 * @param {string} removedAdminUsername - Removed admin's username
 */
async function logAdminRemoved(ownerUsername, removedAdminUsername) {
  await logOwnerAction(
    'ADMIN_REMOVED',
    `Owner ${ownerUsername} removed admin`,
    removedAdminUsername
  );
}

/**
 * Log admin blocked
 * @param {string} ownerUsername - Owner who blocked the admin
 * @param {string} blockedAdminUsername - Blocked admin's username
 */
async function logAdminBlocked(ownerUsername, blockedAdminUsername) {
  await logOwnerAction(
    'ADMIN_BLOCKED',
    `Owner ${ownerUsername} blocked admin`,
    blockedAdminUsername
  );
}

/**
 * Log password change
 * @param {string} ownerUsername - Owner who changed the password
 * @param {string} targetAdminUsername - Admin whose password was changed
 */
async function logPasswordChanged(ownerUsername, targetAdminUsername) {
  await logOwnerAction(
    'PASSWORD_CHANGED',
    `Owner ${ownerUsername} changed password for`,
    targetAdminUsername
  );
}

/**
 * Log delete approval
 * @param {string} ownerUsername - Owner who approved
 * @param {string} productId - Product that was approved for deletion
 */
async function logDeleteApproved(ownerUsername, productId) {
  await logOwnerAction(
    'DELETE_APPROVED',
    `Owner ${ownerUsername} approved deletion`,
    productId
  );
}

/**
 * Log delete denial
 * @param {string} ownerUsername - Owner who denied
 * @param {string} productId - Product that was restored
 */
async function logDeleteDenied(ownerUsername, productId) {
  await logOwnerAction(
    'DELETE_DENIED',
    `Owner ${ownerUsername} denied deletion and restored`,
    productId
  );
}

/**
 * Log edit reversal
 * @param {string} ownerUsername - Owner who reversed the edit
 * @param {string} productId - Product whose edit was reversed
 */
async function logEditReversed(ownerUsername, productId) {
  await logOwnerAction(
    'EDIT_REVERSED',
    `Owner ${ownerUsername} reversed edits for`,
    productId
  );
}

module.exports = {
  logAuthentication,
  logProductAction,
  logOwnerAction,
  logAdminAdded,
  logAdminRemoved,
  logAdminBlocked,
  logPasswordChanged,
  logDeleteApproved,
  logDeleteDenied,
  logEditReversed,
};
