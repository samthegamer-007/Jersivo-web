// index.js - Homepage functionality

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
    document.getElementById('homeSearch').focus();
}

// Handle search
function handleSearch(event) {
    if (event.key === 'Enter') {
        const query = event.target.value.trim();
        if (query) {
            window.location.href = `/?q=${encodeURIComponent(query)}`;
        }
    }
}

// Search team (determines if club or national)
function searchTeam(teamName) {
    const nationalTeams = ['Argentina', 'Brazil', 'France', 'Spain', 'England', 'Germany', 'Portugal', 'Netherlands'];
    
    if (nationalTeams.includes(teamName)) {
        window.location.href = `/national-team?q=${encodeURIComponent(teamName)}`;
    } else {
        window.location.href = `/club-jerseys?q=${encodeURIComponent(teamName)}`;
    }
}

// Toggle teams grid
let teamsExpanded = false;
function toggleTeams() {
    const grid = document.getElementById('teamGrid');
    const btn = document.getElementById('showAllBtn');
    
    teamsExpanded = !teamsExpanded;
    
    if (teamsExpanded) {
        grid.classList.remove('collapsed');
        btn.textContent = 'Show Less';
    } else {
        grid.classList.add('collapsed');
        btn.textContent = 'Show All Teams';
        document.getElementById('shop-teams').scrollIntoView({ behavior: 'smooth' });
    }
}

// Load cart count
function loadCartCount() {
    const cart = JSON.parse(localStorage.getItem('jersivoCart') || '[]');
    document.getElementById('cartCount').textContent = cart.length;
}

// Load featured products
async function loadFeaturedProducts() {
    try {
        const response = await fetch('/api/products?featured=true&limit=8');
        const products = await response.json();
        
        const container = document.getElementById('featuredContainer');
        
        if (products.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #718096;">No featured products yet.</p>';
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="product-card" onclick="viewProduct('${product.id}')">
                <img src="${product.image1}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <span class="product-label">${product.label || 'New'}</span>
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">₹${product.price}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading featured products:', error);
        document.getElementById('featuredContainer').innerHTML = 
            '<p style="text-align: center; color: #e53e3e;">Failed to load products.</p>';
    }
}

// View product (opens modal - to be implemented)
function viewProduct(productId) {
    // TODO: Open product modal with details
    console.log('View product:', productId);
    // For now, redirect to appropriate category page
    // This will be implemented when we add product modals
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCartCount();
    loadFeaturedProducts();
    
    // Handle URL search query if present
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q');
    if (searchQuery) {
        // Redirect to appropriate search results
        // This will be handled by the search implementation
        console.log('Search query:', searchQuery);
    }
});
