const googleSheets = require('./googleSheets');

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
      user_agent: req ? (req.get('user-agent') || 'Unknown') : 'System',
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