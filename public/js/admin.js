// admin.js - Admin Panel JavaScript

let allProducts = [];
let currentTab = 'addProduct';

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadProducts();
});

// ==========================================
// AUTHENTICATION
// ==========================================

async function checkAuth() {
    try {
        const response = await fetch('/api/admin/check-auth');
        const data = await response.json();
        
        if (!data.authenticated || data.role !== 'admin') {
            window.location.href = '/admin-login.html';
            return;
        }
        
        document.getElementById('adminUsername').textContent = data.username || 'Admin';
        
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/admin-login.html';
    }
}

function logout() {
    fetch('/api/admin/logout', { method: 'POST' })
        .then(() => window.location.href = '/admin-login.html')
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
// ADD PRODUCT
// ==========================================

async function addProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productData = {
        name: formData.get('name'),
        category: formData.get('category'),
        teamCode: formData.get('teamCode').toUpperCase(),
        price: formData.get('price'),
        image1: formData.get('image1'),
        image2: formData.get('image2'),
        description: formData.get('description'),
        featured: formData.get('featured') === 'on'
    };
    
    try {
        const response = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Product added successfully!\nSKU: ${data.sku}`);
            event.target.reset();
            await loadProducts();
        } else {
            alert('Failed to add product: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Add product failed:', error);
        alert('Failed to add product');
    }
}

// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {
    const container = document.getElementById('productsContent');
    container.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        const response = await fetch('/api/admin/products');
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

// ==========================================
// FILTER PRODUCTS
// ==========================================

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = allProducts.filter(p => {
        // Search filter
        if (searchTerm) {
            const matchesSearch = 
                p.name.toLowerCase().includes(searchTerm) ||
                p.sku.toLowerCase().includes(searchTerm) ||
                (p.teamCode && p.teamCode.toLowerCase().includes(searchTerm));
            if (!matchesSearch) return false;
        }
        
        // Category filter
        if (categoryFilter && p.category !== categoryFilter) return false;
        
        // Status filter
        if (statusFilter === 'active' && p.status !== 'active') return false;
        if (statusFilter === 'deleted' && p.status !== 'deleted') return false;
        
        return true;
    });
    
    displayProducts(filtered);
}

function displayProducts(products) {
    const container = document.getElementById('productsContent');
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div class="empty-state-title">No Products Found</div>
                <div class="empty-state-text">Try adjusting your filters or add a new product</div>
            </div>
        `;
        return;
    }
    
    let html = '<div class="table-container"><table>';
    html += '<thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    
    products.forEach(product => {
        let badges = '';
        
        if (product.status === 'deleted') {
            badges = '<span class="status-badge status-deleted">DELETED</span>';
        } else {
            badges = '<span class="status-badge status-active">ACTIVE</span>';
            if (product.featured) {
                badges += ' <span class="status-badge status-featured">FEATURED</span>';
            }
        }
        
        html += `
            <tr>
                <td>${product.sku}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>₹${product.price}</td>
                <td>${badges}</td>
                <td>
                    ${product.status === 'active' 
                        ? `
                            <button class="btn btn-success" onclick='openEditModal(${JSON.stringify(product).replace(/'/g, "&apos;")})'>Edit</button>
                            <button class="btn btn-danger" onclick="deleteProduct('${product.sku}')">Delete</button>
                        `
                        : '<span style="color: #666;">Deleted</span>'
                    }
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ==========================================
// EDIT PRODUCT
// ==========================================

function openEditModal(product) {
    document.getElementById('editSku').value = product.sku;
    document.getElementById('editName').value = product.name;
    document.getElementById('editPrice').value = product.price;
    document.getElementById('editImage1').value = product.image1;
    document.getElementById('editImage2').value = product.image2;
    document.getElementById('editDescription').value = product.description || '';
    document.getElementById('editFeatured').checked = product.featured || false;
    
    document.getElementById('editProductModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editProductModal').classList.remove('active');
    document.getElementById('editProductForm').reset();
}

async function updateProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const sku = formData.get('sku');
    const updates = {
        name: formData.get('name'),
        price: formData.get('price'),
        image1: formData.get('image1'),
        image2: formData.get('image2'),
        description: formData.get('description'),
        featured: formData.get('featured') === 'on'
    };
    
    try {
        const response = await fetch(`/api/admin/products/${sku}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Product updated successfully!');
            closeEditModal();
            await loadProducts();
        } else {
            alert('Failed to update product: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Update product failed:', error);
        alert('Failed to update product');
    }
}

// ==========================================
// DELETE PRODUCT (SOFT DELETE)
// ==========================================

async function deleteProduct(sku) {
    if (!confirm(`Request deletion of ${sku}?\n\nThis will mark the product as pending deletion and hide it from the website. The owner will review and approve this request.`)) return;
    
    try {
        const response = await fetch(`/api/admin/products/${sku}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Delete request submitted!\n\nProduct has been hidden from website and is awaiting owner approval.');
            await loadProducts();
        } else {
            alert('Failed to delete product: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Delete product failed:', error);
        alert('Failed to delete product');
    }
}
