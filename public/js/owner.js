// owner.js - Owner Panel JavaScript

let currentTab = 'dashboard';
let allProducts = [];
let allOrders = [];
let allAdmins = [];
let allLogs = [];

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDashboardStats();
    await loadDeleteRequests();
    await loadAdmins();
    await loadProducts();
    await loadOrders();
    await loadCustomerList();
    await loadAuditLogs();
});

// ==========================================
// AUTHENTICATION
// ==========================================

async function checkAuth() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (!data.authenticated || data.role !== 'owner') {
            window.location.href = '/owner-login.html';
            return;
        }
        
        document.getElementById('ownerUsername').textContent = data.username || 'Owner';
        
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/owner-login.html';
    }
}

function logout() {
    fetch('/api/logout', { method: 'POST' })
        .then(() => window.location.href = '/owner-login.html')
        .catch(err => console.error('Logout failed:', err));
}

// ==========================================
// TAB SWITCHING
// ==========================================

function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    
    currentTab = tabName;
}

// ==========================================
// DASHBOARD
// ==========================================

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/owner/dashboard-stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('statPendingDeletes').textContent = data.stats.pendingDeletes || 0;
            document.getElementById('statActiveAdmins').textContent = data.stats.activeAdmins || 0;
            document.getElementById('statTotalAdmins').textContent = data.stats.totalAdmins || 0;
            document.getElementById('statPendingOrders').textContent = data.stats.pendingOrders || 0;
            
            document.getElementById('deleteRequestsBadge').textContent = data.stats.pendingDeletes || 0;
            document.getElementById('ordersBadge').textContent = data.stats.pendingOrders || 0;
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

// ==========================================
// DELETE REQUESTS
// ==========================================

async function loadDeleteRequests() {
    const container = document.getElementById('deleteRequestsContent');
    container.innerHTML = '<div class="loading">Loading delete requests...</div>';
    
    try {
        const response = await fetch('/api/owner/delete-requests');
        const data = await response.json();
        
        if (!data.success || data.requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <div class="empty-state-title">No Pending Delete Requests</div>
                    <div class="empty-state-text">All product deletions have been reviewed</div>
                </div>
            `;
            return;
        }
        
        let html = '<div class="table-container"><table>';
        html += '<thead><tr><th>SKU</th><th>Product Name</th><th>Category</th><th>Requested By</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
        
        data.requests.forEach(req => {
            html += `
                <tr>
                    <td>${req.sku}</td>
                    <td>${req.name}</td>
                    <td>${req.category}</td>
                    <td>${req.requestedBy}</td>
                    <td>${new Date(req.requestedAt).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-success" onclick="approveDelete('${req.sku}')">Approve</button>
                        <button class="btn btn-danger" onclick="rejectDelete('${req.sku}')">Reject</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load delete requests:', error);
        container.innerHTML = '<div class="empty-state-text">Failed to load delete requests</div>';
    }
}

async function approveDelete(sku) {
    if (!confirm(`Approve deletion of ${sku}? This SKU will be permanently retired.`)) return;
    
    try {
        const response = await fetch('/api/owner/approve-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Product deleted successfully');
            await loadDeleteRequests();
            await loadDashboardStats();
        } else {
            alert('Failed to delete product: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Approve delete failed:', error);
        alert('Failed to approve deletion');
    }
}

async function rejectDelete(sku) {
    if (!confirm(`Reject deletion of ${sku}? Product will be restored.`)) return;
    
    try {
        const response = await fetch('/api/owner/deny-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Product restored successfully');
            await loadDeleteRequests();
            await loadDashboardStats();
        } else {
            alert('Failed to restore product: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Reject delete failed:', error);
        alert('Failed to reject deletion');
    }
}

// ==========================================
// ADMIN MANAGEMENT
// ==========================================

async function loadAdmins() {
    const container = document.getElementById('adminsContent');
    container.innerHTML = '<div class="loading">Loading admins...</div>';
    
    try {
        const response = await fetch('/api/owner/admins');
        const data = await response.json();
        
        if (!data.success) {
            container.innerHTML = '<div class="empty-state-text">Failed to load admins</div>';
            return;
        }
        
        allAdmins = data.admins;
        
        let html = '<div class="table-container"><table>';
        html += '<thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>';
        
        data.admins.forEach(admin => {
            const statusClass = admin.status === 'active' ? 'status-active' : 'status-inactive';
            html += `
                <tr>
                    <td>${admin.username}</td>
                    <td>${admin.role}</td>
                    <td><span class="status-badge ${statusClass}">${admin.status}</span></td>
                    <td>${new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td>
                        ${admin.status === 'active' 
                            ? `<button class="btn btn-danger" onclick="deactivateAdmin('${admin.username}')">Deactivate</button>`
                            : `<button class="btn btn-success" onclick="reactivateAdmin('${admin.username}')">Reactivate</button>`
                        }
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load admins:', error);
        container.innerHTML = '<div class="empty-state-text">Failed to load admins</div>';
    }
}

function openAddAdminModal() {
    document.getElementById('addAdminModal').classList.add('active');
}

function closeAddAdminModal() {
    document.getElementById('addAdminModal').classList.remove('active');
    document.getElementById('addAdminForm').reset();
}

async function addAdmin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const adminData = {
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch('/api/owner/add-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Admin created successfully');
            closeAddAdminModal();
            await loadAdmins();
            await loadDashboardStats();
        } else {
            alert('Failed to create admin: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Add admin failed:', error);
        alert('Failed to create admin');
    }
}

async function deactivateAdmin(username) {
    if (!confirm(`Deactivate admin "${username}"? They will no longer be able to log in.`)) return;
    
    try {
        const response = await fetch('/api/owner/deactivate-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Admin deactivated successfully');
            await loadAdmins();
            await loadDashboardStats();
        } else {
            alert('Failed to deactivate admin: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Deactivate admin failed:', error);
        alert('Failed to deactivate admin');
    }
}

async function reactivateAdmin(username) {
    if (!confirm(`Reactivate admin "${username}"?`)) return;
    
    try {
        const response = await fetch('/api/owner/reactivate-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Admin reactivated successfully');
            await loadAdmins();
            await loadDashboardStats();
        } else {
            alert('Failed to reactivate admin: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Reactivate admin failed:', error);
        alert('Failed to reactivate admin');
    }
}

// ==========================================
// PRODUCTS OVERSIGHT
// ==========================================

async function loadProducts() {
    const container = document.getElementById('productsContent');
    container.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        const response = await fetch('/api/owner/products');
        const data = await response.json();
        
        if (!data.success) {
            container.innerHTML = '<div class="empty-state-text">Failed to load products</div>';
            return;
        }
        
        allProducts = data.products;
        filterProducts();
        
    } catch (error) {
        console.error('Failed to load products:', error);
        container.innerHTML = '<div class="empty-state-text">Failed to load products</div>';
    }
}

function filterProducts() {
    const categoryFilter = document.getElementById('productCategoryFilter').value;
    const statusFilter = document.getElementById('productStatusFilter').value;
    
    let filtered = allProducts.filter(p => {
        if (categoryFilter && p.category !== categoryFilter) return false;
        if (statusFilter && p.status !== statusFilter) return false;
        return true;
    });
    
    const container = document.getElementById('productsContent');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state-text">No products match the filters</div>';
        return;
    }
    
    let html = '<div class="table-container"><table>';
    html += '<thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Created By</th><th>Actions</th></tr></thead><tbody>';
    
    filtered.forEach(product => {
        let statusClass = 'status-active';
        let statusText = product.status;
        
        if (product.status === 'deleted') statusClass = 'status-deleted';
        else if (product.pendingDelete) {
            statusClass = 'status-pending';
            statusText = 'Pending Delete';
        }
        
        html += `
            <tr>
                <td>${product.sku}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>₹${product.price}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${product.createdBy || 'N/A'}</td>
                <td>
                    ${product.status === 'deleted' 
                        ? '<span style="color: #666;">Permanently Deleted</span>'
                        : `<button class="btn btn-secondary" onclick="viewProductHistory('${product.sku}')">History</button>`
                    }
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function viewProductHistory(sku) {
    alert(`Product history for ${sku} - Feature coming soon!`);
}

// ==========================================
// ORDERS
// ==========================================

async function loadOrders() {
    const container = document.getElementById('ordersContent');
    container.innerHTML = '<div class="loading">Loading orders...</div>';
    
    try {
        const response = await fetch('/api/owner/orders');
        const data = await response.json();
        
        if (!data.success) {
            container.innerHTML = '<div class="empty-state-text">Failed to load orders</div>';
            return;
        }
        
        allOrders = data.orders;
        filterOrders();
        
    } catch (error) {
        console.error('Failed to load orders:', error);
        container.innerHTML = '<div class="empty-state-text">Failed to load orders</div>';
    }
}

function filterOrders() {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    
    let filtered = allOrders.filter(o => {
        if (statusFilter === 'pending') return o.status === 'pending';
        if (statusFilter === 'confirmed') return o.status === 'confirmed';
        return true; // 'all'
    });
    
    const container = document.getElementById('ordersContent');
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-title">No Orders Found</div>
                <div class="empty-state-text">No orders match the selected filter</div>
            </div>
        `;
        return;
    }
    
    let html = '<div class="table-container"><table>';
    html += '<thead><tr><th>Order No.</th><th>Customer</th><th>Location</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    
    filtered.forEach(order => {
        const statusClass = order.status === 'confirmed' ? 'status-confirmed' : 'status-pending';
        
        html += `
            <tr>
                <td>${order.orderNo}</td>
                <td>${order.email || 'N/A'}<br><small>${order.phone || 'N/A'}</small></td>
                <td>${order.location}</td>
                <td>${order.payment}</td>
                <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                <td>
                    ${order.status === 'pending' 
                        ? `
                            <button class="btn btn-success" onclick="confirmOrder('${order.orderNo}')">Confirm</button>
                            <button class="btn btn-danger" onclick="rejectOrder('${order.orderNo}')">Reject</button>
                        `
                        : `<button class="btn btn-secondary" onclick="viewOrderDetails('${order.orderNo}')">View</button>`
                    }
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function confirmOrder(orderNo) {
    if (!confirm(`Confirm order ${orderNo}?`)) return;
    
    try {
        const response = await fetch('/api/owner/confirm-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNo })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Order confirmed successfully');
            await loadOrders();
            await loadDashboardStats();
        } else {
            alert('Failed to confirm order: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Confirm order failed:', error);
        alert('Failed to confirm order');
    }
}

async function rejectOrder(orderNo) {
    if (!confirm(`Reject order ${orderNo}?`)) return;
    
    try {
        const response = await fetch('/api/owner/reject-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNo })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Order rejected successfully');
            await loadOrders();
            await loadDashboardStats();
        } else {
            alert('Failed to reject order: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Reject order failed:', error);
        alert('Failed to reject order');
    }
}

function viewOrderDetails(orderNo) {
    alert(`Order details for ${orderNo} - Feature coming soon!`);
}

// ==========================================
// CUSTOMER LIST
// ==========================================

async function loadCustomerList() {
    const container = document.getElementById('customerListContent');
    container.innerHTML = '<div class="loading">Loading customer list...</div>';
    
    try {
        const response = await fetch('/api/owner/customer-list');
        const data = await response.json();
        
        if (!data.success || data.customers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📧</div>
                    <div class="empty-state-title">No Customers Yet</div>
                    <div class="empty-state-text">Customer contacts will appear here after orders are confirmed</div>
                </div>
            `;
            return;
        }
        
        let html = '<div class="table-container"><table>';
        html += '<thead><tr><th>#</th><th>Phone Number</th><th>Email</th></tr></thead><tbody>';
        
        data.customers.forEach((customer, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${customer.phone || 'N/A'}</td>
                    <td>${customer.email || 'N/A'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load customer list:', error);
        container.innerHTML = '<div class="empty-state-text">Failed to load customer list</div>';
    }
}

function exportCustomerList() {
    alert('Export customer list - Feature coming soon!');
}

// ==========================================
// AUDIT LOGS
// ==========================================

async function loadAuditLogs() {
    const container = document.getElementById('auditLogsContent');
    container.innerHTML = '<div class="loading">Loading audit logs...</div>';
    
    try {
        const response = await fetch('/api/owner/audit-logs');
        const data = await response.json();
        
        if (!data.success) {
            container.innerHTML = '<div class="empty-state-text">Failed to load audit logs</div>';
            return;
        }
        
        allLogs = data.logs;
        filterAuditLogs();
        
    } catch (error) {
        console.error('Failed to load audit logs:', error);
        container.innerHTML = '<div class="empty-state-text">Failed to load audit logs</div>';
    }
}

function filterAuditLogs() {
    const actionFilter = document.getElementById('logActionFilter').value;
    const adminFilter = document.getElementById('logAdminFilter').value.toLowerCase();
    const dateFilter = document.getElementById('logDateFilter').value;
    
    let filtered = allLogs.filter(log => {
        if (actionFilter && !log.action.toLowerCase().includes(actionFilter)) return false;
        if (adminFilter && !log.username.toLowerCase().includes(adminFilter)) return false;
        if (dateFilter && !log.timestamp.startsWith(dateFilter)) return false;
        return true;
    });
    
    const container = document.getElementById('auditLogsContent');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state-text">No logs match the filters</div>';
        return;
    }
    
    let html = '<div class="table-container"><table>';
    html += '<thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead><tbody>';
    
    filtered.forEach(log => {
        html += `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.username}</td>
                <td>${log.action}</td>
                <td>${log.details || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}
