// club-jerseys.js - Club jerseys category page functionality

const CATEGORY = 'Club jerseys';

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Navigate
function navigate(path) {
    window.location.href = path;
}

// Focus search
function focusSearch() {
    document.getElementById('categorySearch').focus();
}

// Handle search
function handleSearch(event) {
    if (event.key === 'Enter') {
        const query = event.target.value.trim();
        if (query) {
            window.location.href = `/club-jerseys?q=${encodeURIComponent(query)}`;
        } else {
            window.location.href = '/club-jerseys';
        }
    }
}

// Load cart count
function loadCartCount() {
    const cart = JSON.parse(localStorage.getItem('jersivoCart') || '[]');
    document.getElementById('cartCount').textContent = cart.length;
}

// Load products
async function loadProducts() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        
        let url = `/api/products/search?category=${encodeURIComponent(CATEGORY)}`;
        if (searchQuery) {
            url += `&q=${encodeURIComponent(searchQuery)}`;
            document.getElementById('categorySearch').value = searchQuery;
        }
        
        const response = await fetch(url);
        const products = await response.json();
        
        const grid = document.getElementById('productsGrid');
        
        if (products.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <h3>No jerseys found</h3>
                    <p>Try adjusting your search or browse all club jerseys</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = products.map(product => `
            <div class="product-card" onclick="viewProduct('${product.sku}')">
                <img src="${product.image1}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">₹${product.price}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="loading">Failed to load products. Please try again.</div>';
    }
}

// View product (placeholder - will implement modal later)
function viewProduct(sku) {
    console.log('View product:', sku);
    // TODO: Open product modal
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCartCount();
    loadProducts();
});
