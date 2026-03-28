// cart.js - Cart page functionality

let selectedShipping = null;

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function navigate(path) {
    window.location.href = path;
}

function loadCart() {
    const cart = JSON.parse(localStorage.getItem('jersivoCart') || '[]');
    document.getElementById('cartCount').textContent = cart.length;
    
    const cartContent = document.getElementById('cartContent');
    
    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Add some jerseys to get started!</p>
                <a href="/" class="shop-btn">Continue Shopping</a>
            </div>
        `;
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
    
    cartContent.innerHTML = `
        <div class="cart-grid">
            <div class="cart-items">
                ${cart.map((item, index) => `
                    <div class="cart-item">
                        <img src="${item.image}" alt="${item.name}" class="item-image">
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            ${item.customization ? `<div style="color: #718096; font-size: 14px; margin-top: 4px;">${item.customization}</div>` : ''}
                            <div class="item-price">₹${item.price}</div>
                            <div class="item-remove" onclick="removeItem(${index})">Remove</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-summary">
                <div class="summary-title">Order Summary</div>
                <div class="summary-row">
                    <span>Subtotal (${cart.length} items)</span>
                    <span>₹${subtotal}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                </div>
                <div class="summary-total">
                    <span>Total</span>
                    <span>₹${subtotal}+</span>
                </div>
                <button class="checkout-btn" onclick="openOrderForm()">Proceed to Checkout</button>
            </div>
        </div>
    `;
}

function removeItem(index) {
    const cart = JSON.parse(localStorage.getItem('jersivoCart') || '[]');
    cart.splice(index, 1);
    localStorage.setItem('jersivoCart', JSON.stringify(cart));
    loadCart();
}

function openOrderForm() {
    document.getElementById('orderModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeOrderForm() {
    document.getElementById('orderModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    selectedShipping = null;
    document.querySelectorAll('.shipping-card').forEach(card => card.classList.remove('selected'));
    document.getElementById('paymentGroup').style.display = 'none';
}

function selectShipping(method) {
    selectedShipping = method;
    document.getElementById('shippingMethod').value = method;
    
    // Update UI
    document.querySelectorAll('.shipping-card').forEach(card => card.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    
    // Show payment options
    const paymentGroup = document.getElementById('paymentGroup');
    const paymentMethod = document.getElementById('paymentMethod');
    
    paymentGroup.style.display = 'block';
    
    if (method === 'indiapost') {
        // India Post: Prepaid only
        paymentMethod.innerHTML = '<option value="prepaid">Online Payment (Prepaid Only)</option>';
        paymentMethod.disabled = true;
    } else {
        // Shiprocket/Delhivery: Both options
        paymentMethod.innerHTML = `
            <option value="prepaid">Online Payment</option>
            <option value="cod">Cash on Delivery (+₹49)</option>
        `;
        paymentMethod.disabled = false;
    }
}

document.getElementById('orderForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!selectedShipping) {
        alert('Please select a shipping method');
        return;
    }
    
    const formData = new FormData(e.target);
    const cart = JSON.parse(localStorage.getItem('jersivoCart') || '[]');
    
    // Generate order number (DDMMYY-XXX format)
    const now = new Date();
    const orderNo = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    // Build Instagram DM message
    let message = '==============================\n';
    message += `Order No. - ${orderNo}\n\n`;
    message += `Name - ${formData.get('name')}\n`;
    message += `Phone - ${formData.get('phone')}\n`;
    message += `Email address - ${formData.get('email') || 'N/A'}\n`;
    message += `Full address - ${formData.get('address')}, ${formData.get('city')}\n`;
    message += `Pin code - ${formData.get('pincode')}\n`;
    message += `State - ${formData.get('state')}\n\n`;
    message += `Items-\n`;
    
    cart.forEach((item, index) => {
        message += `${index + 1}) ${item.sku}\n`;
        if (item.customization) {
            message += `   ${item.customization}\n`;
        }
    });
    
    message += `\nShipping - ${selectedShipping.charAt(0).toUpperCase() + selectedShipping.slice(1)}\n`;
    message += `Payment option - ${formData.get('payment') === 'cod' ? 'COD' : 'Online'}\n`;
    message += '==============================';
    
    // Open Instagram DM with pre-filled message
    const instagramUrl = `https://ig.me/m/shop.jersivo?text=${encodeURIComponent(message)}`;
    window.open(instagramUrl, '_blank');
    
    // Clear cart
    localStorage.removeItem('jersivoCart');
    
    // Show success message
    alert('Opening Instagram... Please send the pre-filled message to complete your order!');
    
    // Redirect to home
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
});

// Initialize
document.addEventListener('DOMContentLoaded', loadCart);
