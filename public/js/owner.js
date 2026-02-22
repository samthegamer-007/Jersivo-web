// ============================================
// OWNER PANEL - Main JavaScript
// God Mode Control Center
// ============================================

let currentUser = null;
let socket = null;
let adminStatuses = [];
let deleteRequests = [];
let adminsList = [];
let currentLogs = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  setupEventListeners();
});

// ============================================
// SESSION MANAGEMENT
// ============================================

async function checkSession() {
  try {
    const response = await fetch('/api/check-session');
    const data = await response.json();

    if (data.authenticated && data.user.role === 'OWNER') {
      currentUser = data.user;
      showOwnerPanel();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('Session check error:', error);
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('owner-panel').classList.remove('active');
}

function showOwnerPanel() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('owner-panel').classList.add('active');
  document.getElementById('owner-name').textContent = `👑 ${currentUser.name}`;
  
  // Connect WebSocket
  connectWebSocket();
  
  // Load initial data
  loadDashboard();
  loadDeleteRequests();
  loadAdmins();
}

// ============================================
// LOGIN / LOGOUT
// ============================================

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  
  errorEl.textContent = '';
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success && data.user.role === 'OWNER') {
      currentUser = data.user;
      showOwnerPanel();
    } else if (data.success && data.user.role !== 'OWNER') {
      errorEl.textContent = 'Access denied. Owner credentials required.';
    } else {
      errorEl.textContent = data.error || 'Login failed';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorEl.textContent = 'Login failed. Please try again.';
  }
}

async function handleLogout() {
  try {
    if (socket) {
      socket.disconnect();
    }
    
    await fetch('/api/logout', { method: 'POST' });
    
    currentUser = null;
    showLoginScreen();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================

function connectWebSocket() {
  socket = io();
  
  // Join owner room
  socket.emit('owner:join', {
    role: 'OWNER',
    username: currentUser.username
  });
  
  // Listen for admin status updates
  socket.on('admin:status:update', (statuses) => {
    adminStatuses = statuses;
    displayAdminStatuses(statuses);
    updateStats();
  });
  
  // Listen for notifications
  socket.on('notification', (notification) => {
    showNotification(notification);
    
    if (notification.type === 'delete_request') {
      loadDeleteRequests();
    }
  });
  
  // Listen for delete count updates
  socket.on('delete:count:update', () => {
    loadDeleteRequests();
  });
  
  console.log('✅ Owner WebSocket connected');
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
  // Admin statuses are loaded via WebSocket
  updateStats();
}

function displayAdminStatuses(statuses) {
  const listEl = document.getElementById('admin-status-list');
  
  if (statuses.length === 0) {
    listEl.innerHTML = '<p>No admins connected</p>';
    return;
  }
  
  listEl.innerHTML = statuses.map(admin => {
    let statusIcon = '';
    let statusText = '';
    
    if (admin.isConnected) {
      if (admin.status === 'ACTIVE_WORKING') {
        statusIcon = '🟢🟢';
        statusText = 'Active - Working';
      } else {
        statusIcon = '🟢🟡';
        statusText = 'Active - Idle';
      }
    } else {
      statusIcon = '🟡';
      statusText = 'Inactive (Panel closed)';
    }
    
    return `
      <div class="admin-status-card">
        <div class="admin-header">
          <h3>${admin.name} (${admin.username})</h3>
          <span class="status-indicator">${statusIcon}</span>
        </div>
        <p class="status-text">${statusText}</p>
        ${admin.lastAction ? `<p class="status-text">Last: ${admin.lastAction}</p>` : ''}
        ${admin.lastActivity ? `<p class="status-text">Activity: ${new Date(admin.lastActivity).toLocaleTimeString()}</p>` : ''}
        <div class="admin-actions">
          <button class="btn-block" onclick="blockAdmin('${admin.username}')">Block</button>
          <button class="btn-password" onclick="openChangePasswordModal('${admin.username}', '${admin.name}')">Change Password</button>
          <button class="btn-force-logout" onclick="forceLogoutAdmin('${admin.username}')">Force Logout</button>
          <button class="btn-remove" onclick="removeAdmin('${admin.username}', '${admin.name}')">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}

async function updateStats() {
  // Count pending deletes
  const deleteCount = deleteRequests.length;
  document.getElementById('delete-badge').textContent = deleteCount;
  document.getElementById('stat-deletes').textContent = deleteCount;
  
  // Count active admins
  const activeCount = adminStatuses.filter(a => a.isConnected).length;
  document.getElementById('stat-active-admins').textContent = activeCount;
  
  // Total admins
  document.getElementById('stat-total-admins').textContent = adminsList.length;
}

// ============================================
// DELETE REQUESTS
// ============================================

async function loadDeleteRequests() {
  const listEl = document.getElementById('delete-requests-list');
  listEl.innerHTML = '<p class="loading">Loading delete requests...</p>';
  
  try {
    const response = await fetch('/api/owner/delete-requests?sheet=Sheet1');
    const data = await response.json();
    
    deleteRequests = data;
    displayDeleteRequests(data);
    updateStats();
  } catch (error) {
    console.error('Error loading delete requests:', error);
    listEl.innerHTML = '<p class="error">Failed to load delete requests</p>';
  }
}

function displayDeleteRequests(requests) {
  const listEl = document.getElementById('delete-requests-list');
  
  if (requests.length === 0) {
    listEl.innerHTML = '<p>No pending delete requests ✅</p>';
    return;
  }
  
  listEl.innerHTML = requests.map(product => `
    <div class="delete-request-card">
      <img src="${product.image1}" alt="${product.name}">
      <div class="delete-request-info">
        <h3>${product.name}</h3>
        <p class="delete-request-meta">ID: ${product.id}</p>
        <p class="delete-request-meta">Category: ${product.category}</p>
        <p class="delete-request-meta">Price: ₹${product.price}</p>
        <p class="delete-request-meta">Requested by: ${product.last_modified_by}</p>
        <p class="delete-request-meta">Requested at: ${new Date(product.last_modified_at).toLocaleString()}</p>
      </div>
      <div class="delete-request-actions">
        <button class="btn-approve" onclick="approveDelete('${product.id}', '${product.name}')">✅ Approve</button>
        <button class="btn-deny" onclick="denyDelete('${product.id}', '${product.name}')">❌ Deny & Restore</button>
      </div>
    </div>
  `).join('');
}

async function approveDelete(productId, productName) {
  if (!confirm(`Permanently delete "${productName}"?\n\nThis CANNOT be undone!`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/owner/approve-delete/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetName: 'Sheet1' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification({
        type: 'success',
        message: `✅ Product "${productName}" permanently deleted`
      });
      loadDeleteRequests();
    } else {
      alert('Failed to approve delete');
    }
  } catch (error) {
    console.error('Error approving delete:', error);
    alert('Failed to approve delete');
  }
}

async function denyDelete(productId, productName) {
  if (!confirm(`Restore "${productName}"?\n\nAdmin will NOT know you restored it!`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/owner/deny-delete/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetName: 'Sheet1' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification({
        type: 'success',
        message: `✅ Product "${productName}" restored! Admin won't know! 🤫`
      });
      loadDeleteRequests();
    } else {
      alert('Failed to deny delete');
    }
  } catch (error) {
    console.error('Error denying delete:', error);
    alert('Failed to deny delete');
  }
}

// ============================================
// MANAGE ADMINS
// ============================================

async function loadAdmins() {
  const listEl = document.getElementById('admins-list');
  listEl.innerHTML = '<p class="loading">Loading admins...</p>';
  
  try {
    const response = await fetch('/api/owner/admins');
    const data = await response.json();
    
    adminsList = data;
    displayAdmins(data);
    updateStats();
  } catch (error) {
    console.error('Error loading admins:', error);
    listEl.innerHTML = '<p class="error">Failed to load admins</p>';
  }
}

function displayAdmins(admins) {
  const listEl = document.getElementById('admins-list');
  
  listEl.innerHTML = admins.map(admin => {
    // Check if admin is currently connected (from WebSocket real-time data)
    const liveStatus = adminStatuses.find(a => a.username === admin.username);
    const isOnline = liveStatus && liveStatus.isConnected;
    
    // Determine actual status
    let displayStatus = admin.status;
    let statusClass = `status-${admin.status.toLowerCase()}`;
    let statusIcon = '';
    
    if (isOnline) {
      if (liveStatus.status === 'ACTIVE_WORKING') {
        displayStatus = 'ONLINE - Working';
        statusClass = 'status-online-working';
        statusIcon = '🟢🟢';
      } else {
        displayStatus = 'ONLINE - Idle';
        statusClass = 'status-online-idle';
        statusIcon = '🟢🟡';
      }
    } else {
      displayStatus = 'OFFLINE';
      statusClass = 'status-offline';
      statusIcon = '🔴';
    }
    
    return `
      <div class="admin-card">
        <div class="admin-info">
          <h3>
            ${admin.name}
            <span class="role-badge role-${admin.role.toLowerCase()}">${admin.role}</span>
          </h3>
          <p>Username: ${admin.username}</p>
          <p>Status: ${statusIcon} <span class="${statusClass}">${displayStatus}</span></p>
          <p>Created: ${new Date(admin.created_at).toLocaleDateString()}</p>
          ${isOnline ? `<p style="font-size: 12px; color: #666;">Last Activity: ${new Date(liveStatus.lastActivity).toLocaleTimeString()}</p>` : ''}
        </div>
        ${admin.role !== 'OWNER' ? `
          <div class="admin-actions">
            <button class="btn-password" onclick="openChangePasswordModal('${admin.username}', '${admin.name}')">Change Password</button>
            <button class="btn-block" onclick="blockAdmin('${admin.username}')">Block</button>
            <button class="btn-remove" onclick="removeAdmin('${admin.username}', '${admin.name}')">Remove</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function handleAddAdmin(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const admin = Object.fromEntries(formData);
  const messageEl = document.getElementById('add-admin-message');
  
  messageEl.textContent = 'Adding admin...';
  messageEl.className = 'message';
  
  try {
    const response = await fetch('/api/owner/add-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(admin)
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageEl.textContent = `✅ ${data.message}`;
      messageEl.className = 'message success';
      
      e.target.reset();
      setTimeout(() => {
        document.getElementById('add-admin-form-container').style.display = 'none';
        loadAdmins();
      }, 1500);
    } else {
      messageEl.textContent = `❌ ${data.error}`;
      messageEl.className = 'message error';
    }
  } catch (error) {
    console.error('Error adding admin:', error);
    messageEl.textContent = '❌ Failed to add admin';
    messageEl.className = 'message error';
  }
}

function openChangePasswordModal(username, name) {
  document.getElementById('change-password-admin').textContent = `${name} (${username})`;
  document.getElementById('change-password-username').value = username;
  document.getElementById('new-password').value = '';
  document.getElementById('password-result').style.display = 'none';
  document.getElementById('change-password-modal').classList.add('active');
}

function closeChangePasswordModal() {
  document.getElementById('change-password-modal').classList.remove('active');
}

async function handleChangePassword(e) {
  e.preventDefault();
  
  const username = document.getElementById('change-password-username').value;
  const newPassword = document.getElementById('new-password').value;
  
  try {
    const response = await fetch(`/api/owner/change-password/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show password result
      document.getElementById('display-new-password').textContent = data.newPassword;
      document.getElementById('password-result').style.display = 'block';
      e.target.style.display = 'none';
    } else {
      alert('Failed to change password');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    alert('Failed to change password');
  }
}

function copyPassword() {
  const password = document.getElementById('display-new-password').textContent;
  navigator.clipboard.writeText(password).then(() => {
    alert('✅ Password copied to clipboard!');
  });
}

async function blockAdmin(username) {
  if (!confirm(`Block admin "${username}"?\n\nThey won't be able to login!`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/owner/block-admin/${username}`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${data.message}`);
      loadAdmins();
    } else {
      alert('Failed to block admin');
    }
  } catch (error) {
    console.error('Error blocking admin:', error);
    alert('Failed to block admin');
  }
}

async function removeAdmin(username, name) {
  if (!confirm(`PERMANENTLY REMOVE admin "${name}"?\n\nThis cannot be undone!`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/owner/remove-admin/${username}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${data.message}`);
      loadAdmins();
    } else {
      alert('Failed to remove admin');
    }
  } catch (error) {
    console.error('Error removing admin:', error);
    alert('Failed to remove admin');
  }
}

function forceLogoutAdmin(username) {
  alert('Force logout feature: Coming soon!\n\nCurrently admins auto-logout after 30min of inactivity.');
}

// ============================================
// AUDIT LOGS
// ============================================

async function loadLogs() {
  const logType = document.getElementById('log-type-select').value;
  const listEl = document.getElementById('logs-list');
  
  listEl.innerHTML = '<p class="loading">Loading logs...</p>';
  
  try {
    const response = await fetch(`/api/owner/logs/${encodeURIComponent(logType)}`);
    const data = await response.json();
    
    currentLogs = data;
    displayLogs(data, logType);
  } catch (error) {
    console.error('Error loading logs:', error);
    listEl.innerHTML = '<p class="error">Failed to load logs</p>';
  }
}

function displayLogs(logs, logType) {
  const listEl = document.getElementById('logs-list');
  
  if (logs.length === 0) {
    listEl.innerHTML = '<p>No logs found</p>';
    return;
  }
  
  listEl.innerHTML = logs.reverse().map(log => {
    let details = '';
    
    if (logType === 'Authentication') {
      details = `${log.admin_name} (${log.admin_id}) - ${log.action}`;
    } else if (logType === 'Product Actions') {
      details = `${log.admin_name} - ${log.action} - ${log.product_id}: ${log.details}`;
    } else if (logType === 'Owner Actions') {
      details = `${log.action} - ${log.details} - ${log.affected_item}`;
    }
    
    return `
      <div class="log-entry">
        <p class="log-time">${new Date(log.timestamp).toLocaleString()}</p>
        <p class="log-action">${log.action || 'ACTION'}</p>
        <p class="log-details">${details}</p>
      </div>
    `;
  }).join('');
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(notification) {
  const message = notification.message || 'Notification';
  
  // Simple alert for now (can be upgraded to toast notifications)
  console.log('🔔 Notification:', message);
  
  // You can implement a toast notification system here
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Login
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSection(btn.dataset.section);
      
      // Load data when switching sections
      if (btn.dataset.section === 'logs') {
        loadLogs();
      } else if (btn.dataset.section === 'delete-requests') {
        loadDeleteRequests();
      } else if (btn.dataset.section === 'admins') {
        loadAdmins();
      }
    });
  });
  
  // Refresh buttons
  document.getElementById('refresh-deletes-btn').addEventListener('click', loadDeleteRequests);
  document.getElementById('refresh-logs-btn').addEventListener('click', loadLogs);
  
  // Log type selector
  document.getElementById('log-type-select').addEventListener('change', loadLogs);
  
  // Add admin
  document.getElementById('show-add-admin-btn').addEventListener('click', () => {
    document.getElementById('add-admin-form-container').style.display = 'block';
  });
  
  document.getElementById('cancel-add-admin-btn').addEventListener('click', () => {
    document.getElementById('add-admin-form-container').style.display = 'none';
  });
  
  document.getElementById('add-admin-form').addEventListener('submit', handleAddAdmin);
  
  // Change password
  document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
}

function switchSection(section) {
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
  
  // Hide all sections
  document.querySelectorAll('.owner-section').forEach(sec => {
    sec.classList.remove('active');
  });
  
  // Show selected section
  document.getElementById(`${section}-section`).classList.add('active');
}
