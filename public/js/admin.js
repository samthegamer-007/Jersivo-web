// ============================================
// JERSIVO ADMIN PANEL - JavaScript
// Modern table-based interface
// ============================================

let currentUser = null;
let socket = null;
let products = [];
let productToDelete = null;

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

    if (data.authenticated) {
      currentUser = data.user;
      showAdminPanel();
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
  document.getElementById('admin-panel').classList.remove('active');
}

function showAdminPanel() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('admin-panel').classList.add('active');
  document.getElementById('admin-name').textContent = currentUser.name;
  
  // Connect WebSocket
  connectWebSocket();
  
  // Load products
  loadProducts();
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
    
    if (data.success) {
      currentUser = data.user;
      showAdminPanel();
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
  if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
    script.onload = () => initializeWebSocket();
    document.head.appendChild(script);
  } else {
    initializeWebSocket();
  }
}

function initializeWebSocket() {
  socket = io();
  
  socket.emit('admin:connect', {
    username: currentUser.username,
    name: currentUser.name,
    role: currentUser.role
  });
  
  let activityTimeout;
  const sendActivity = (action) => {
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
      socket.emit('admin:activity', { action });
    }, 5000);
  };
  
  ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
    document.addEventListener(event, () => sendActivity('User active'));
  });
  
  console.log('✅ WebSocket connected');
}

// ============================================
// LOAD PRODUCTS
// ============================================

async function loadProducts() {
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading products...</td></tr>';
  
  try {
    const response = await fetch('/api/admin/products?sheet=Sheet1');
    const data = await response.json();
    
    products = data;
    displayProducts(products);
  } catch (error) {
    console.error('Error loading products:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Failed to load products</td></tr>';
  }
}

function displayProducts(productsToShow) {
  const tbody = document.getElementById('products-tbody');
  
  if (productsToShow.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No products found</td></tr>';
    return;
  }
  
  tbody.innerHTML = productsToShow.map(product => `
    <tr>
      <td><img src="${product.image1}" alt="${product.name}" class="product-img"></td>
      <td><strong>${product.name}</strong><br><small>${product.id}</small></td>
      <td>${product.category}</td>
      <td><strong>Rs ${product.price.toLocaleString()}</strong></td>
      <td>${product.label === 'BESTSELLER' || product.label === 'HOT' ? `<span class="featured-badge">Featured</span>` : ''}</td>
      <td>
        <div class="product-actions">
          <button onclick="editProduct('${product.id}')" class="btn-edit">Edit</button>
          <button onclick="confirmDelete('${product.id}', '${product.name}')" class="btn-delete">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================
// SEARCH & FILTER
// ============================================

function setupEventListeners() {
  // Login
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const section = btn.dataset.section;
      switchSection(section);
    });
  });
  
  // Refresh products
  document.getElementById('refresh-products-btn').addEventListener('click', loadProducts);
  
  // Search
  document.getElementById('search-products').addEventListener('input', filterProducts);
  
  // Category filter
  document.getElementById('filter-category').addEventListener('change', filterProducts);
  
  // Add product form
  document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
  
  // Edit product form
  document.getElementById('edit-product-form').addEventListener('submit', handleEditProduct);
  document.getElementById('cancel-edit-btn').addEventListener('click', () => switchSection('products'));
  
  // Delete modal
  document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirm-delete-btn').addEventListener('click', handleDelete);
}

function filterProducts() {
  const searchTerm = document.getElementById('search-products').value.toLowerCase();
  const category = document.getElementById('filter-category').value;
  
  let filtered = products;
  
  if (category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }
  
  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.id.toLowerCase().includes(searchTerm) ||
      (p.description && p.description.toLowerCase().includes(searchTerm))
    );
  }
  
  displayProducts(filtered);
}

function switchSection(section) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
  
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.remove('active');
  });
  
  // Show selected section
  const sectionId = section === 'products' ? 'products-section' : 
                    section === 'add-product' ? 'add-product-section' : 
                    'edit-product-section';
  
  document.getElementById(sectionId).classList.add('active');
  
  // Update page title
  const titles = {
    'products': 'Products Management',
    'add-product': 'Add New Product',
    'edit-product': 'Edit Product'
  };
  document.getElementById('page-title').textContent = titles[section] || 'Admin Panel';
}

// ============================================
// ADD PRODUCT
// ============================================

async function handleAddProduct(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const product = Object.fromEntries(formData);
  const messageEl = document.getElementById('add-product-message');
  
  messageEl.textContent = 'Adding product...';
  messageEl.className = 'form-message';
  
  if (!product.image1.includes('res.cloudinary.com')) {
    messageEl.textContent = 'Image 1 must be from Cloudinary!';
    messageEl.className = 'form-message error';
    return;
  }
  
  if (product.image2 && !product.image2.includes('res.cloudinary.com')) {
    messageEl.textContent = 'Image 2 must be from Cloudinary!';
    messageEl.className = 'form-message error';
    return;
  }
  
  try {
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageEl.textContent = '✅ Product added successfully!';
      messageEl.className = 'form-message success';
      
      e.target.reset();
      
      setTimeout(() => {
        loadProducts();
        switchSection('products');
      }, 1500);
      
      if (socket) {
        socket.emit('product:added', {
          adminName: currentUser.name,
          productId: product.id
        });
      }
    } else {
      messageEl.textContent = `❌ ${data.error}`;
      messageEl.className = 'form-message error';
    }
  } catch (error) {
    console.error('Error adding product:', error);
    messageEl.textContent = '❌ Failed to add product';
    messageEl.className = 'form-message error';
  }
}

// ============================================
// EDIT PRODUCT
// ============================================

function editProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  document.getElementById('edit-product-id').value = product.id;
  document.getElementById('edit-id').value = product.id;
  document.getElementById('edit-name').value = product.name;
  document.getElementById('edit-price').value = product.price;
  document.getElementById('edit-category').value = product.category;
  document.getElementById('edit-label').value = product.label;
  document.getElementById('edit-sizes').value = product.sizes;
  document.getElementById('edit-image1').value = product.image1;
  document.getElementById('edit-image2').value = product.image2 || '';
  document.getElementById('edit-description').value = product.description || '';
  document.getElementById('edit-customisable').value = product.customisable || 'No';
  
  switchSection('edit-product');
}

async function handleEditProduct(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const updates = Object.fromEntries(formData);
  const productId = document.getElementById('edit-product-id').value;
  
  const messageEl = document.getElementById('edit-product-message');
  messageEl.textContent = 'Updating product...';
  messageEl.className = 'form-message';
  
  try {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageEl.textContent = '✅ Product updated successfully!';
      messageEl.className = 'form-message success';
      
      setTimeout(() => {
        loadProducts();
        switchSection('products');
      }, 1500);
      
      if (socket) {
        socket.emit('product:edited', {
          adminName: currentUser.name,
          productId: productId
        });
      }
    } else {
      messageEl.textContent = `❌ ${data.error}`;
      messageEl.className = 'form-message error';
    }
  } catch (error) {
    console.error('Error updating product:', error);
    messageEl.textContent = '❌ Failed to update product';
    messageEl.className = 'form-message error';
  }
}

// ============================================
// DELETE PRODUCT (STEALTH MODE)
// ============================================

function confirmDelete(productId, productName) {
  productToDelete = productId;
  document.querySelector('.delete-product-name').textContent = productName;
  document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
  productToDelete = null;
  document.getElementById('delete-modal').classList.remove('active');
}

async function handleDelete() {
  if (!productToDelete) return;
  
  try {
    const response = await fetch(`/api/admin/products/${productToDelete}?sheet=Sheet1`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      closeDeleteModal();
      
      if (socket) {
        socket.emit('product:delete_request', {
          adminName: currentUser.name,
          productId: productToDelete
        });
      }
      
      loadProducts();
      
      alert('✅ Product deleted successfully');
    } else {
      alert('❌ Failed to delete product');
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('❌ Failed to delete product');
  }
    }
