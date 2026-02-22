// ============================================
// SEARCH ALIASES
// ============================================
const searchAliases = {
  // Barcelona
  'barca': 'barcelona', 'barça': 'barcelona', 'fcb': 'barcelona',
  // Man United
  'man u': 'manchester united', 'man utd': 'manchester united', 'mufc': 'manchester united',
  // Man City
  'man city': 'manchester city', 'city': 'manchester city', 'mcfc': 'manchester city',
  // Other teams
  'spurs': 'tottenham', 'gunners': 'arsenal', 'juve': 'juventus',
  'bayern': 'bayern munich', 'psg': 'paris', 'real': 'real madrid',
  'pool': 'liverpool', 'blues': 'chelsea',
};

function enhanceSearchTerm(term) {
  const normalized = term.toLowerCase().trim();
  return searchAliases[normalized] || term;
}

// ============================================
// MAIN APPLICATION LOGIC
// ============================================
class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.init();
  }

  async init() {
    await this.loadProducts();
    await this.loadFeaturedProducts();
    this.attachFilterListeners();
    this.setupSmoothScroll();
  }

  async loadProducts() {
    try {
      const response = await fetch('/api/products');
      this.products = await response.json();
      this.filteredProducts = this.products;
      this.renderProducts();
    } catch (error) {
      console.error('Error loading products:', error);
      document.getElementById('productsGrid').innerHTML = 
        '<div class="loading">Error loading products. Please refresh the page.</div>';
    }
  }

  async loadFeaturedProducts() {
    try {
      const response = await fetch('/api/products/featured');
      const featured = await response.json();
      this.renderFeaturedProducts(featured);
    } catch (error) {
      console.error('Error loading featured products:', error);
    }
  }

  renderProducts() {
    const grid = document.getElementById('productsGrid');
    
    if (this.filteredProducts.length === 0) {
      grid.innerHTML = '<div class="loading">No products found matching your criteria.</div>';
      return;
    }
    
    grid.innerHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
  }

  renderFeaturedProducts(products) {
    const container = document.getElementById('featuredProducts');
    
    if (products.length === 0) {
      container.innerHTML = '<div class="loading">No featured products available.</div>';
      return;
    }
    
    container.innerHTML = products.map(product => this.createProductCard(product)).join('');
  }

  createProductCard(product) {
    const hasSecondImage = product.image2 && product.image2.trim() !== '';
    
    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-images">
          <img 
            src="${product.image1}" 
            alt="${product.name}" 
            class="product-image primary"
            onerror="this.src='https://via.placeholder.com/400x500/e0e0e0/666666?text=No+Image'"
          >
          ${hasSecondImage ? `
            <img 
              src="${product.image2}" 
              alt="${product.name}" 
              class="product-image secondary"
              onerror="this.style.display='none'"
            >
          ` : ''}
        </div>
        <div class="product-info">
          <div class="product-category">${product.category}</div>
          <h3 class="product-name">${product.name}</h3>
          ${product.description ? `<p class="product-description" style="font-size: 14px; color: var(--text-light); margin-bottom: 12px;">${product.description}</p>` : ''}
          <div class="product-footer">
            <span class="product-price">₹${product.price.toLocaleString()}</span>
            <button class="add-to-cart-btn" onclick="productManager.addToCart(${product.id})">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }

  addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      cart.addItem(product);
      this.showNotification('Product added to cart!');
    }
  }

  attachFilterListeners() {
    // Search with alias enhancement
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = enhanceSearchTerm(e.target.value); // ← ENHANCED!
        this.filterProducts(searchTerm, this.getCurrentCategory());
      });
    }

    // Category filter
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.dataset.category;
        this.filterProducts(this.getCurrentSearchTerm(), category);
      });
    });
  }

  getCurrentSearchTerm() {
    const searchInput = document.getElementById('searchInput');
    return searchInput ? searchInput.value : '';
  }

  getCurrentCategory() {
    const activeBtn = document.querySelector('.category-btn.active');
    return activeBtn ? activeBtn.dataset.category : 'all';
  }

  filterProducts(searchTerm, category) {
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = category === 'all' || product.category === category;
      
      return matchesSearch && matchesCategory;
    });
    
    this.renderProducts();
  }

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  showNotification(message) {
    // Simple notification (can be enhanced with a toast system)
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize the application
let productManager;
document.addEventListener('DOMContentLoaded', () => {
  productManager = new ProductManager();
});
