// Firebase imports are already in index.html

// Variables globales
window.cart = window.cart || [];
window.products = window.products || [];

// Funciones para persistencia del carrito con localStorage
function saveCartToLocalStorage() {
    try {
        localStorage.setItem('luxessence_cart', JSON.stringify(window.cart));
    } catch (error) {
        console.error('Error saving cart to localStorage:', error);
    }
}

function loadCartFromLocalStorage() {
    try {
        const savedCart = localStorage.getItem('luxessence_cart');
        if (savedCart) {
            window.cart = JSON.parse(savedCart);
            updateCartCount();
        }
    } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        window.cart = [];
    }
}

// Filter variables
let currentSearchQuery = '';
let currentCategory = 'all';
let inStockFilter = false;
let outOfStockFilter = false; // Show all products initially
let currentMaxPrice = 2000; // Default max price

// Load products from Firebase with real-time updates
function loadProducts() {
    try {
        console.log("Setting up real-time product loading from Firebase...");
        console.log("Firebase db object:", window.db);

        if (!window.db) {
            console.error("Firebase db is not initialized");
            document.getElementById('product-grid').innerHTML = '<p>Error: Firebase no está inicializado correctamente.</p>';
            return;
        }

        const productsCollection = window.collection(window.db, 'users/D2xl3vTv7CS9Hp2gkYoa7GwtVvz1/products');
        console.log("Products collection reference:", productsCollection);

        // Use onSnapshot for real-time updates
        window.onSnapshot(productsCollection, (querySnapshot) => {
            console.log("Real-time update - Query snapshot size:", querySnapshot.size);
            console.log("Query snapshot empty?", querySnapshot.empty);
            console.log("Query snapshot docs:", querySnapshot.docs);

            products = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Document ID:", doc.id);
                console.log("Document data:", data);

                // Check if required fields exist
                if (!data.name || !data.price) {
                    console.warn("Document missing required fields:", doc.id, data);
                    return;
                }

                products.push({
                    id: doc.id,
                    name: data.name,
                    price: data.price,
                    imageUrl: data.imageUrl,
                    stock: data.stock || 0,
                    category: data.category || 'Sin categoría'
                });
            });

            console.log("Final products array:", products);
            console.log("Products length:", products.length);

            if (products.length === 0) {
                document.getElementById('product-grid').innerHTML = '<p>No hay productos disponibles en este momento.</p>';
                return;
            }

            // Load categories before sorting to preserve original order
            loadCategories(products);

            // Sort products by stock descending (highest stock first)
            products.sort((a, b) => b.stock - a.stock);

            applyFiltersAndDisplay();
        }, (error) => {
            console.error("Error in real-time product loading: ", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            document.getElementById('product-grid').innerHTML = '<p>Error al cargar productos. Verifica tu conexión a internet y la configuración de Firebase.</p>';
        });
    } catch (error) {
        console.error("Error setting up real-time product loading: ", error);
        console.error("Error stack:", error.stack);
        document.getElementById('product-grid').innerHTML = '<p>Error al cargar productos. Verifica tu conexión a internet.</p>';
    }
}



// Load categories from products
function loadCategories(products) {
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = '';

    // Get unique categories
    const categories = [...new Set(products.map(product => product.category).filter(cat => cat))];

    // Add "Todas" option
    const allButton = document.createElement('button');
    allButton.className = 'category-btn active';
    allButton.textContent = 'Todas';
    allButton.dataset.category = 'all';
    categoryList.appendChild(allButton);

    // Add category buttons
    categories.forEach(category => {
        const categoryButton = document.createElement('button');
        categoryButton.className = 'category-btn';
        categoryButton.textContent = formatCategory(category);
        categoryButton.dataset.category = category;
        categoryList.appendChild(categoryButton);
    });
}

// Function to format category names for display
function formatCategory(category) {
    return category
        .replace(/-/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Function to properly capitalize category names
function capitalizeCategory(category) {
    return category
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Apply all filters and display products
function applyFiltersAndDisplay() {
    let filteredProducts = products;

    // Apply search filter
    if (currentSearchQuery) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
            (product.category && product.category.toLowerCase().includes(currentSearchQuery.toLowerCase()))
        );
    }

    // Apply category filter
    if (currentCategory !== 'all') {
        filteredProducts = filteredProducts.filter(product => product.category === currentCategory);
    }

    // Apply stock filter
    if (inStockFilter && !outOfStockFilter) {
        filteredProducts = filteredProducts.filter(product => product.stock > 0);
    } else if (!inStockFilter && outOfStockFilter) {
        filteredProducts = filteredProducts.filter(product => product.stock === 0);
    }
    // If both are checked or both unchecked, show all

    // Apply price filter
    filteredProducts = filteredProducts.filter(product => {
        const price = product.name.toLowerCase().includes('jibbitz') ? 25 : product.price;
        return price <= currentMaxPrice;
    });

    displayProducts(filteredProducts);
}

// Display products
function displayProducts(productList) {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';

    if (productList.length === 0) {
        productGrid.innerHTML = '<p>No se encontraron productos que coincidan con los filtros.</p>';
        return;
    }

    productList.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        const isJibbitz = product.name.toLowerCase().includes('jibbitz');
        const isOutOfStock = product.stock === 0;
        let actionsHtml = '';

        if (isJibbitz) {
            actionsHtml = `
                <button class="choose-combo-btn ${isOutOfStock ? 'out-of-stock-btn' : ''}" data-id="${product.id}" title="Elegir Combos" ${isOutOfStock ? 'disabled' : ''}><i class="fas fa-plus"></i> Elegir Combos</button>
                <button class="add-to-cart ${isOutOfStock ? 'out-of-stock-btn' : ''}" data-id="${product.id}" data-jibbitz="true" ${isOutOfStock ? 'disabled' : ''}><i class="fas fa-cart-plus"></i> Agregar</button>
            `;
        } else {
            actionsHtml = `
                <div class="quantity-controls">
                    <button class="quantity-btn minus-btn ${isOutOfStock ? 'out-of-stock-btn' : ''}" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}><i class="fas fa-minus-circle"></i></button>
                    <span class="quantity-display" data-id="${product.id}">0</span>
                    <button class="quantity-btn plus-btn ${isOutOfStock ? 'out-of-stock-btn' : ''}" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}><i class="fas fa-plus-circle"></i></button>
                </div>
                <button class="add-to-cart ${isOutOfStock ? 'out-of-stock-btn' : ''}" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}><i class="fas fa-cart-plus"></i> Agregar</button>
            `;
        }

        const outOfStockLabel = isOutOfStock ? '<div class="out-of-stock-label">Out of Stock</div>' : '';

        productCard.innerHTML = `
            ${outOfStockLabel}
            <div class="product-image-container">
                <img src="${product.imageUrl || 'images/logo.svg'}" alt="${product.name}" class="product-image">
                <div class="zoom-overlay" data-id="${product.id}">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name" title="${product.name}">${product.name}</h3>
                <p class="product-price" data-id="${product.id}">L <strong>${isJibbitz ? '25' : product.price}</strong></p>
                <p class="product-stock">Stock: ${product.stock}</p>
                <div class="product-actions">
                    ${actionsHtml}
                </div>
            </div>
        `;
        productGrid.appendChild(productCard);
    });
}

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (product.stock === 0) {
        showNotification('Sin stock suficiente. Recibiremos más próximamente.', 'error');
        return;
    }
    const isJibbitz = product.name.toLowerCase().includes('jibbitz');

    if (isJibbitz) {
        // Handle Jibbitz selection using modal
        if (!product.jibbitzSelection || product.jibbitzSelection.length === 0) {
            showNotification('Selecciona un combo primero', 'warning');
            return;
        }

        // Check total stock
        const totalJibbitz = product.jibbitzSelection.reduce((sum, s) => sum + (s.quantity * s.combo), 0);
        if (totalJibbitz > product.stock) {
            showNotification('Sin stock suficiente. Recibiremos más próximamente.', 'error');
            return;
        }

        // Add each combo as separate cart items
        product.jibbitzSelection.forEach(selection => {
            const comboName = `${product.name} (${selection.combo} unidades)`;
            const comboPrice = selection.price / selection.combo; // price per unit
            const comboQuantity = selection.quantity * selection.combo;

            const existingItem = cart.find(item => item.name === comboName && item.id === productId);
            if (existingItem) {
                existingItem.quantity += comboQuantity;
            } else {
                cart.push({
                    ...product,
                    name: comboName,
                    quantity: comboQuantity,
                    price: comboPrice
                });
            }
        });

        // Clear selection
        delete product.jibbitzSelection;

        // Reset price display to default
        const priceElement = document.querySelector(`.product-price[data-id="${productId}"] strong`);
        priceElement.textContent = '25';
    } else {
        // Handle regular products
        const quantityDisplay = document.querySelector(`.quantity-display[data-id="${productId}"]`);
        const quantity = parseInt(quantityDisplay.textContent);

        if (quantity <= 0) {
            showNotification('Selecciona una cantidad primero', 'warning');
            return;
        }

        if (quantity > product.stock) {
            showNotification('Sin stock suficiente. Recibiremos más próximamente.', 'error');
            return;
        }

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ ...product, quantity: quantity });
        }

        // Reset quantity display
        quantityDisplay.textContent = '0';
    }

    updateCartCount();
    saveCartToLocalStorage();
    showNotification('Producto agregado al carrito', 'success');
}

// Update cart count
function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalItems;

    if (totalItems > 0) {
        cartCount.style.display = 'inline-flex';
        // Adjust width based on number of digits for proper centering
        const digitCount = totalItems.toString().length;
        const width = Math.max(20, digitCount * 8 + 4); // Minimum 20px, add 8px per digit + 4px padding
        cartCount.style.width = width + 'px';
    } else {
        cartCount.style.display = 'none';
        cartCount.style.width = ''; // Reset width
    }

    // Update cart preview in checkout
    if (document.getElementById('checkout').classList.contains('hidden') === false) {
        updateCartPreview();
    }
}

// Update cart item count for the view cart link
function updateCartItemCount() {
    const cartItemCount = document.getElementById('cart-item-count');
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartItemCount.textContent = totalItems;
}

// Update cart quantity
function updateCartQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            updateCartCount();
            updateCartItemCount();
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Determine icon based on type
    let iconSvg = '';
    switch (type) {
        case 'success':
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`;
            break;
        case 'error':
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>`;
            break;
        case 'warning':
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>`;
            break;
        default: // info
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>`;
    }

    // Set title and message
    let title = '';
    switch (type) {
        case 'success':
            title = 'Éxito';
            break;
        case 'error':
            title = 'Error';
            break;
        case 'warning':
            title = 'Advertencia';
            break;
        default:
            title = 'Información';
    }

    toast.innerHTML = `
        <div class="toast-content">
            ${iconSvg}
            <div class="toast-text">
                <strong class="toast-title">${title}</strong>
                <p class="toast-message">${message}</p>
            </div>
            <button class="toast-close" type="button" aria-label="Cerrar notificación">
                <span class="sr-only">Cerrar</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-close-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;

    // Append to body
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto hide after 5 seconds
    const hideTimeout = setTimeout(() => {
        hideToast(toast);
    }, 5000);

    // Close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(hideTimeout);
        hideToast(toast);
    });

    function hideToast(toastElement) {
        toastElement.classList.remove('show');
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
        }, 300);
    }
}

// Show cart
// Mostrar la sección del carrito
function showCart() {
    hideAllSections();
    const cartSection = document.getElementById('carrito');
    cartSection.classList.remove('hidden');
    cartSection.style.display = 'block';
    displayCartItems();
}

// Show checkout
function showCheckout() {
    // Acceder a cart desde el scope global (definido en script.js)
    if (!window.cart || window.cart.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        showProducts();
        return;
    }
    hideAllSections();
    const checkoutSection = document.getElementById('checkout');
    checkoutSection.classList.remove('hidden');
    checkoutSection.style.display = 'block';
    updateCartPreview();
}



// Display cart items
function displayCartItems() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';

    if (cart.length === 0) {
        cartItems.innerHTML = '<p><i class="fas fa-shopping-cart"></i> Tu carrito está vacío</p>';
        updateCartItemCount();
        return;
    }

    cart.forEach(item => {
        const cartItem = document.createElement('li');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.imageUrl || 'images/logo.svg'}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.name}</h3>
            </div>
            <div class="cart-item-controls">
                <input type="number" min="1" value="${item.quantity}" id="qty-${item.id}" class="cart-quantity-input" data-id="${item.id}">
                <button class="cart-remove-btn" data-id="${item.id}">
                    <span class="sr-only">Remove item</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="cart-remove-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });

    updateCartItemCount();
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    displayCartItems();
    showNotification('Producto removido del carrito', 'info');
}





// Scroll to products section
function scrollToProducts() {
    document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
}

// Show products section
// Ocultar todas las secciones principales
function hideAllSections() {
    const sections = ['productos', 'carrito', 'checkout'];
    sections.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

// Mostrar la sección de productos
function showProducts() {
    hideAllSections();
    document.getElementById('productos').classList.remove('hidden');
}

// Toggle mobile menu
function closeMenu() {
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');
    navLinks.classList.remove('active');
    hamburger.classList.remove('active');
}

function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');
    const isActive = navLinks.classList.contains('active');

    if (isActive) {
        closeMenu();
    } else {
        navLinks.classList.add('active');
        hamburger.classList.add('active');
    }
}

// Update quantity
function updateQuantity(productId, change) {
    const quantityDisplay = document.querySelector(`.quantity-display[data-id="${productId}"]`);
    const product = products.find(p => p.id === productId);
    let currentQuantity = parseInt(quantityDisplay.textContent);

    currentQuantity += change;

    if (currentQuantity < 0) currentQuantity = 0;
    if (currentQuantity > product.stock) {
        showNotification('Sin stock suficiente. Recibiremos más próximamente.', 'error');
        return;
    }

    quantityDisplay.textContent = currentQuantity;
}

// Update combo quantity
function updateComboQuantity(productId, combo, change) {
    const quantityDisplay = document.querySelector(`.quantity-display[data-combo="${combo}"][data-id="${productId}"]`);
    const product = products.find(p => p.id === productId);
    let currentQuantity = parseInt(quantityDisplay.textContent);

    currentQuantity += change;

    if (currentQuantity < 0) currentQuantity = 0;
    // For combos, check if total would exceed stock
    const totalComboQuantity = [1, 3, 5].reduce((total, c) => {
        const qty = parseInt(document.querySelector(`.quantity-display[data-combo="${c}"][data-id="${productId}"]`).textContent);
        return total + qty * c;
    }, 0) + (change > 0 ? change * combo : 0);

    if (totalComboQuantity > product.stock) {
        showNotification('Sin stock suficiente. Recibiremos más próximamente.', 'error');
        return;
    }

    quantityDisplay.textContent = currentQuantity;
}

// Search functionality
function searchProducts(query) {
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
    );
    displayProducts(filteredProducts);
}

// Filter products by category
function filterProductsByCategory(category) {
    if (category === 'all') {
        displayProducts(products);
    } else {
        const filteredProducts = products.filter(product => product.category === category);
        displayProducts(filteredProducts);
    }
}

// Function to initialize app after Firebase is ready
function initializeApp() {
    loadCartFromLocalStorage();
    loadProducts();
    showProducts(); // Show products section by default
    document.getElementById('checkout').classList.add('hidden'); // Ensure checkout is hidden initially
    document.getElementById('carrito').classList.add('hidden'); // Ensure cart is hidden initially
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Forcefully unregister service workers and clear caches to prevent offline cache notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                registration.unregister().then(() => {
                    console.log('Service Worker unregistered successfully');
                });
            });
        });
    }

    // Clear all caches
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name).then(() => {
                    console.log('Cache cleared:', name);
                });
            });
        });
    }

    // Wait for Firebase to be initialized before loading products
    if (window.db) {
        initializeApp();
    } else {
        // Wait for Firebase initialization
        const checkFirebase = setInterval(() => {
            if (window.db) {
                clearInterval(checkFirebase);
                initializeApp();
            }
        }, 100);
    }



    // Ensure stock filter buttons are not active on load
    document.getElementById('in-stock-filter').classList.remove('active');
    document.getElementById('out-of-stock-filter').classList.remove('active');

    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    // Real-time search as user types
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim();
        applyFiltersAndDisplay();
    });

    // Mobile search toggle
    if (window.innerWidth <= 768) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchInput.classList.toggle('search-visible');
            if (searchInput.classList.contains('search-visible')) {
                const rect = searchBtn.getBoundingClientRect();
                searchInput.style.position = 'fixed';
                searchInput.style.top = (rect.bottom + 5) + 'px'; // Position below the search button
                searchInput.style.left = '0';
                searchInput.style.right = '0';
                searchInput.style.width = '92vw';
                searchInput.style.zIndex = '1000';
                searchInput.style.backgroundColor = 'rgba(117, 52, 52, 0.8)'; // Semi-transparent background
                searchInput.style.borderRadius = '50px'; // Fully rounded rectangle
                searchInput.focus();
            } else {
                searchInput.style.position = '';
                searchInput.style.top = '';
                searchInput.style.left = '';
                searchInput.style.right = '';
                searchInput.style.width = '';
                searchInput.style.zIndex = '';
            }
        });

        // Hide input when losing focus on mobile
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchInput.classList.remove('search-visible');
                searchInput.style.position = '';
                searchInput.style.top = '';
                searchInput.style.left = '';
                searchInput.style.right = '';
                searchInput.style.width = '';
                searchInput.style.zIndex = '';
            }, 150); // Small delay to allow clicking on results if needed
        });
    } else {
        // Search button click for desktop (optional, for consistency)
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchProducts(query);
            } else {
                displayProducts(products);
            }
        });
    }

    // Category filtering
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            const category = e.target.dataset.category;
            currentCategory = category;
            applyFiltersAndDisplay();

            // Update active button
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Center the selected category button in the scrollable list
            const categoryList = document.getElementById('category-list');
            const buttonRect = e.target.getBoundingClientRect();
            const listRect = categoryList.getBoundingClientRect();
            const scrollLeft = categoryList.scrollLeft + (buttonRect.left - listRect.left) - (listRect.width / 2) + (buttonRect.width / 2);
            categoryList.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    });

    // Scroll buttons for category filter
    const scrollLeftBtn = document.querySelector('.scroll-left');
    const scrollRightBtn = document.querySelector('.scroll-right');
    const categoryList = document.getElementById('category-list');

    scrollLeftBtn.addEventListener('click', () => {
        categoryList.scrollBy({ left: -200, behavior: 'smooth' });
    });

    scrollRightBtn.addEventListener('click', () => {
        categoryList.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // Add to cart buttons and navigation
    document.addEventListener('click', (e) => {
        // Manejo de la navegación
        if (e.target.id === 'checkout-link' || e.target.closest('#checkout-link')) {
            showCheckout();
        } else if (e.target.id === 'cart-link' || e.target.closest('#cart-link')) {
            showCart();
        } else if (e.target.id === 'continue-shopping-link' || e.target.closest('#continue-shopping-link')) {
            showProducts();
        }

        if (e.target.classList.contains('add-to-cart') || e.target.closest('.add-to-cart')) {
            const button = e.target.classList.contains('add-to-cart') ? e.target : e.target.closest('.add-to-cart');
            if (button.disabled) {
                showNotification('Sin stock suficiente. Recibiremos más próximamente.', 'error');
                return;
            }
            const productId = button.dataset.id;
            addToCart(productId);
        }

        if (e.target.classList.contains('cart-remove-btn') || e.target.closest('.cart-remove-btn')) {
            const productId = e.target.dataset.id || e.target.closest('.cart-remove-btn').dataset.id;
            removeFromCart(productId);
        }

        if (e.target.classList.contains('cart-close-btn') || e.target.closest('.cart-close-btn')) {
            showProducts();
        }

        if (e.target.id === 'cart-link') {
            showCart();
            closeMenu();
        }

        if (e.target.id === 'checkout-link') {
            showCheckout();
        }

        if (e.target.id === 'continue-shopping-link') {
            showProducts();
        }

        // Hamburger menu - check for hamburger class or any child elements
        if (e.target.classList.contains('hamburger') || e.target.closest('.hamburger')) {
            e.preventDefault();
            toggleMenu();
        }

    // Quantity buttons
    if (e.target.classList.contains('plus-btn') || e.target.closest('.plus-btn')) {
        const productId = e.target.dataset.id || e.target.closest('.plus-btn').dataset.id;
        const combo = e.target.dataset.combo || e.target.closest('.plus-btn').dataset.combo;
        if (combo) {
            updateComboQuantity(productId, combo, 1);
        } else {
            updateQuantity(productId, 1);
        }
    }

    if (e.target.classList.contains('minus-btn') || e.target.closest('.minus-btn')) {
        const productId = e.target.dataset.id || e.target.closest('.minus-btn').dataset.id;
        const combo = e.target.dataset.combo || e.target.closest('.minus-btn').dataset.combo;
        if (combo) {
            updateComboQuantity(productId, combo, -1);
        } else {
            updateQuantity(productId, -1);
        }
    }

    // Choose combo button
    if (e.target.classList.contains('choose-combo-btn') || e.target.closest('.choose-combo-btn')) {
        const productId = e.target.dataset.id || e.target.closest('.choose-combo-btn').dataset.id;
        const dropdown = document.querySelector(`.combo-dropdown[data-id="${productId}"]`);
        dropdown.classList.toggle('hidden');
    }
    });

    // Jibbitz modal functionality
    let currentJibbitzProductId = null;

    // Choose combo button
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('choose-combo-btn') || e.target.closest('.choose-combo-btn')) {
            const productId = e.target.dataset.id || e.target.closest('.choose-combo-btn').dataset.id;
            openJibbitzModal(productId);
        }
    });

    // Modal close button
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
            closeJibbitzModal();
        }
    });

    // Modal overlay click to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeJibbitzModal();
        }
    });

    // Modal quantity buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-plus-btn') || e.target.closest('.modal-plus-btn')) {
            const combo = parseInt(e.target.dataset.combo || e.target.closest('.modal-plus-btn').dataset.combo);
            updateModalQuantity(combo, 1);
        }

        if (e.target.classList.contains('modal-minus-btn') || e.target.closest('.modal-minus-btn')) {
            const combo = parseInt(e.target.dataset.combo || e.target.closest('.modal-minus-btn').dataset.combo);
            updateModalQuantity(combo, -1);
        }
    });

    // Confirm combo selection
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('confirm-combo-btn') || e.target.closest('.confirm-combo-btn')) {
            confirmComboSelection();
        }
    });

    // Product modal functionality
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('product-image')) {
            const productCard = e.target.closest('.product-card');
            const productId = productCard.querySelector('.add-to-cart').dataset.id;
            openProductModal(productId);
        }

        // Modal close button
        if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
            closeProductModal();
        }

        // Modal overlay click to close
        if (e.target.classList.contains('modal-overlay') && e.target.id === 'product-modal') {
            closeProductModal();
        }

        // Zoom overlay
        if (e.target.classList.contains('zoom-overlay') || e.target.closest('.zoom-overlay')) {
            const zoomOverlay = e.target.classList.contains('zoom-overlay') ? e.target : e.target.closest('.zoom-overlay');
            const productId = zoomOverlay.dataset.id;
            const product = products.find(p => p.id === productId);
            if (product) {
                openZoomModal(product.imageUrl || 'images/logo.svg', product.name);
            }
        }

        // Zoom button
        if (e.target.classList.contains('zoom-btn') || e.target.closest('.zoom-btn')) {
            const zoomBtn = e.target.classList.contains('zoom-btn') ? e.target : e.target.closest('.zoom-btn');
            const imageUrl = zoomBtn.dataset.image;
            const imageName = zoomBtn.dataset.name;
            openZoomModal(imageUrl, imageName);
        }

        // Enlarged modal quantity buttons
        if (e.target.classList.contains('enlarged-plus') || e.target.closest('.enlarged-plus')) {
            const productId = e.target.dataset.id || e.target.closest('.enlarged-plus').dataset.id;
            updateEnlargedQuantity(productId, 1);
        }

        if (e.target.classList.contains('enlarged-minus') || e.target.closest('.enlarged-minus')) {
            const productId = e.target.dataset.id || e.target.closest('.enlarged-minus').dataset.id;
            updateEnlargedQuantity(productId, -1);
        }

        // Enlarged modal add to cart button
        if (e.target.classList.contains('enlarged-btn') && e.target.classList.contains('add-to-cart')) {
            const productId = e.target.dataset.id;
            const isJibbitz = e.target.dataset.jibbitz === 'true';
            if (isJibbitz) {
                openJibbitzModal(productId);
            } else {
                addToCart(productId);
            }
            closeProductModal();
        }

    // Enlarged modal choose combo button
    if (e.target.classList.contains('enlarged-btn') && e.target.classList.contains('choose-combo-btn')) {
        const productId = e.target.dataset.id;
        openJibbitzModal(productId);
        closeProductModal();
    }
    });

    // Zoom modal close functionality
    document.addEventListener('click', (e) => {
        // Modal close button for zoom modal
        if (e.target.classList.contains('zoom-modal-close') || e.target.closest('.zoom-modal-close')) {
            closeZoomModal();
        }

        // Modal overlay click to close zoom modal
        if (e.target.classList.contains('modal-overlay') && e.target.id === 'zoom-modal') {
            closeZoomModal();
        }
    });

    // Handle quantity change in cart
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('cart-quantity-input')) {
            const productId = e.target.dataset.id;
            const newQuantity = parseInt(e.target.value);
            updateCartQuantity(productId, newQuantity);
        }
    });

    // Checkout form
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);

    // Navigation links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href') === '#productos') {
                e.preventDefault();
                showProducts();
                closeMenu();
            } else if (link.getAttribute('href') === '#contacto') {
                e.preventDefault();
                document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
                closeMenu();
            }
        });
    });

    // Stock filter buttons
    document.addEventListener('click', (e) => {
        if (e.target.id === 'in-stock-filter' || e.target.closest('#in-stock-filter')) {
            inStockFilter = !inStockFilter;
            e.target.classList.toggle('active');
            // Do not apply filters here, wait for "Aplicar Filtros"
        }

        if (e.target.id === 'out-of-stock-filter' || e.target.closest('#out-of-stock-filter')) {
            outOfStockFilter = !outOfStockFilter;
            e.target.classList.toggle('active');
            // Do not apply filters here, wait for "Aplicar Filtros"
        }
    });

    // Price range input
    document.getElementById('price-range').addEventListener('input', (e) => {
        currentMaxPrice = parseInt(e.target.value);
        document.getElementById('price-display').textContent = `Hasta L. ${currentMaxPrice}`;
        // Do not apply filters here, wait for "Aplicar Filtros"
    });

    // Apply filters button
    document.getElementById('apply-filters').addEventListener('click', () => {
        applyFiltersAndDisplay();
    });

    // Clear filters button
    document.getElementById('clear-filters').addEventListener('click', () => {
        // Reset filters
        inStockFilter = false;
        outOfStockFilter = false;
        currentMaxPrice = 2000;
        currentSearchQuery = '';
        currentCategory = 'all';

        // Reset UI
        document.getElementById('in-stock-filter').classList.remove('active');
        document.getElementById('out-of-stock-filter').classList.remove('active');
        document.getElementById('price-range').value = 2000;
        document.getElementById('price-display').textContent = 'Hasta L. 2000';
        document.getElementById('search-input').value = '';

        // Reset category buttons
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.category-btn[data-category="all"]').classList.add('active');

        applyFiltersAndDisplay();
    });

    // Setup delivery type change handlers
    document.querySelectorAll('input[name="deliveryType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const addressGroup = document.getElementById('address-group');
            addressGroup.style.display = e.target.value === 'delivery' ? 'block' : 'none';
            document.getElementById('address').required = e.target.value === 'delivery';
            updateCartPreview(); // Update shipping cost when delivery type changes
        });
    });

    // Filter toggle button for mobile
    document.getElementById('filter-toggle').addEventListener('click', () => {
        const additionalFilters = document.getElementById('additional-filters');
        additionalFilters.classList.toggle('expanded');
        const button = document.getElementById('filter-toggle');
        button.classList.toggle('expanded');
    });

    // Initialize phone number validation
    const phoneInput = document.getElementById('telefono');
    phoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value.length > 8) {
            e.target.value = e.target.value.slice(0, 8);
        }
    });
});

// Cart preview functionality
function updateCartPreview() {
    const cartPreviewItems = document.getElementById('cart-preview-items');
    const subtotalAmount = document.getElementById('subtotal-amount');
    const shippingAmount = document.getElementById('shipping-amount');
    const totalAmount = document.getElementById('total-amount');

    // Clear previous items
    cartPreviewItems.innerHTML = '';

    // Check if cart is empty
    if (cart.length === 0) {
        cartPreviewItems.innerHTML = `
            <div class="empty-cart-message">
                <i class="fas fa-shopping-cart"></i>
                <p>Tu carrito está vacío</p>
                <button onclick="showProducts()" class="continue-shopping-btn">
                    <i class="fas fa-store"></i> Ir a comprar
                </button>
            </div>
        `;
        subtotalAmount.textContent = 'L. 0.00';
        shippingAmount.textContent = 'L. 0.00';
        totalAmount.textContent = 'L. 0.00';
        return;
    }

    // Add current cart items
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-preview-item';
        itemElement.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}">
            <div class="cart-preview-item-details">
                <div class="cart-preview-item-name">${item.name}</div>
                <div class="cart-preview-item-price">
                    ${item.quantity} x L. ${item.price}
                </div>
            </div>
        `;
        cartPreviewItems.appendChild(itemElement);
    });

    // Calculate totals
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = document.querySelector('input[name="deliveryType"]:checked').value === 'delivery' ? 50 : 0;
    const total = subtotal + shipping;

    // Update totals display
    subtotalAmount.textContent = `L. ${subtotal.toFixed(2)}`;
    shippingAmount.textContent = `L. ${shipping.toFixed(2)}`;
    totalAmount.textContent = `L. ${total.toFixed(2)}`;
}

// Jibbitz modal functions
function openJibbitzModal(productId) {
    currentJibbitzProductId = productId;
    const product = products.find(p => p.id === productId);

    // Create modal HTML
    const modalHtml = `
        <div class="modal-overlay" id="jibbitz-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Seleccionar Combos de Jibbitz</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="combo-options">
                        <div class="combo-item" data-combo="1">
                            <div class="combo-info">
                                <span class="combo-name">1 Jibbitz</span>
                                <span class="combo-price">L. 25</span>
                            </div>
                            <div class="combo-controls">
                                <button class="modal-minus-btn" data-combo="1">-</button>
                                <span class="modal-quantity-display" data-combo="1">0</span>
                                <button class="modal-plus-btn" data-combo="1">+</button>
                            </div>
                        </div>
                        <div class="combo-item" data-combo="3">
                            <div class="combo-info">
                                <span class="combo-name">3 Jibbitz</span>
                                <span class="combo-price">L. 70</span>
                            </div>
                            <div class="combo-controls">
                                <button class="modal-minus-btn" data-combo="3">-</button>
                                <span class="modal-quantity-display" data-combo="3">0</span>
                                <button class="modal-plus-btn" data-combo="3">+</button>
                            </div>
                        </div>
                        <div class="combo-item" data-combo="5">
                            <div class="combo-info">
                                <span class="combo-name">5 Jibbitz</span>
                                <span class="combo-price">L. 105</span>
                            </div>
                            <div class="combo-controls">
                                <button class="modal-minus-btn" data-combo="5">-</button>
                                <span class="modal-quantity-display" data-combo="5">0</span>
                                <button class="modal-plus-btn" data-combo="5">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-total">
                        <span>Total: L. <strong id="modal-total-price">0</strong></span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="confirm-combo-btn">Confirmar y agregar al carrito</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeJibbitzModal() {
    const modal = document.getElementById('jibbitz-modal');
    if (modal) {
        modal.remove();
    }
    currentJibbitzProductId = null;
}

function updateModalQuantity(combo, change) {
    const quantityDisplay = document.querySelector(`.modal-quantity-display[data-combo="${combo}"]`);
    const product = products.find(p => p.id === currentJibbitzProductId);
    let currentQuantity = parseInt(quantityDisplay.textContent);

    currentQuantity += change;

    if (currentQuantity < 0) currentQuantity = 0;

    // Check total quantity against stock
    const totalQuantity = [1, 3, 5].reduce((total, c) => {
        const qty = parseInt(document.querySelector(`.modal-quantity-display[data-combo="${c}"]`).textContent);
        return total + qty * c;
    }, 0) + (change > 0 ? change * combo : 0);

    if (totalQuantity > product.stock) {
        showNotification('Sin stock suficiente. Recibiremos más próximamente.', 'error');
        return;
    }

    quantityDisplay.textContent = currentQuantity;
    updateModalTotal();
}

function updateModalTotal() {
    const total = [1, 3, 5].reduce((sum, combo) => {
        const quantity = parseInt(document.querySelector(`.modal-quantity-display[data-combo="${combo}"]`).textContent);
        const price = combo === 1 ? 25 : combo === 3 ? 70 : 105;
        return sum + (quantity * price);
    }, 0);

    document.getElementById('modal-total-price').textContent = total;
}

function confirmComboSelection() {
    const selections = [1, 3, 5].map(combo => ({
        combo: combo,
        quantity: parseInt(document.querySelector(`.modal-quantity-display[data-combo="${combo}"]`).textContent),
        price: combo === 1 ? 25 : combo === 3 ? 70 : 105
    })).filter(s => s.quantity > 0);

    if (selections.length === 0) {
        showNotification('Selecciona al menos un combo', 'warning');
        return;
    }

    // Store selection for addToCart
    const product = products.find(p => p.id === currentJibbitzProductId);
    product.jibbitzSelection = selections;

    // Update price display
    const totalPrice = selections.reduce((sum, s) => sum + (s.quantity * s.price), 0);
    const priceElement = document.querySelector(`.product-price[data-id="${currentJibbitzProductId}"] strong`);
    priceElement.textContent = totalPrice;

    // Add to cart directly
    addToCart(currentJibbitzProductId);

    closeJibbitzModal();
}

// Product modal functions
function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modalHtml = `
        <div class="modal-overlay" id="product-modal">
            <div class="modal-content enlarged-product-card">
                <div class="modal-close">&times;</div>
                <div class="enlarged-product-image-container">
                    <img src="${product.imageUrl || 'images/logo.svg'}" alt="${product.name}" class="enlarged-product-image">
                    <button class="zoom-btn" data-image="${product.imageUrl || 'images/logo.svg'}" data-name="${product.name}">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
                <div class="enlarged-product-info">
                    <h3 class="enlarged-product-name">${product.name}</h3>
                    <p class="enlarged-product-price">L. <strong>${isJibbitzProduct(product) ? '25' : product.price}</strong></p>
                    <p class="enlarged-product-stock">Stock: ${product.stock}</p>
                    <p class="enlarged-product-category">Categoría: ${formatCategory(product.category)}</p>
                    ${isOutOfStock(product) ? '<div class="out-of-stock-notice">Producto agotado. Recibiremos más próximamente.</div>' : ''}
                </div>
            </div>
        </div>`;

    // Renderizar modal en el DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function updateModalQuantityForProduct(productId, change) {
    const quantityDisplay = document.querySelector(`.modal-quantity-display[data-id="${productId}"]`);
    const product = products.find(p => p.id === productId);
    let currentQuantity = parseInt(quantityDisplay.textContent);

    currentQuantity += change;

    if (currentQuantity < 0) currentQuantity = 0;
    if (currentQuantity > product.stock) {
        showNotification('Sin stock suficiente. Recibiremos más próximamente.', 'error');
        return;
    }

    quantityDisplay.textContent = currentQuantity;
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.remove();
    }
}

// Handle checkout form submission
async function handleCheckout(e) {
    e.preventDefault();

    // Get form values
    const name = document.getElementById('name').value;
    const phone = document.getElementById('telefono').value;
    const city = document.getElementById('city').value;
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const address = document.getElementById('address').value;

    // Validate phone number
    if (phone.length !== 8) {
        showNotification('El número de teléfono debe tener 8 dígitos', 'error');
        return;
    }

    // Validate cart is not empty
    if (cart.length === 0) {
        showNotification('El carrito está vacío', 'error');
        return;
    }

    // Create WhatsApp message
    let message = `*Nuevo Pedido*%0A%0A`;
    message += `*Cliente:* ${name}%0A`;
    message += `*Teléfono:* +504${phone}%0A`;
    message += `*Ciudad:* ${city}%0A`;
    message += `*Tipo de entrega:* ${deliveryType === 'delivery' ? 'Delivery' : 'Recoger en tienda'}%0A`;
    if (deliveryType === 'delivery') {
        message += `*Dirección:* ${address}%0A`;
    }
    message += `%0A*Pedido:*%0A`;

    cart.forEach(item => {
        message += `- ${item.quantity}x ${item.name} (L. ${item.price} c/u)%0A`;
    });

    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = deliveryType === 'delivery' ? 50 : 0;
    const total = subtotal + shipping;

    message += `%0A*Subtotal:* L. ${subtotal.toFixed(2)}%0A`;
    message += `*Envío:* L. ${shipping.toFixed(2)}%0A`;
    message += `*Total:* L. ${total.toFixed(2)}`;

    // Open WhatsApp with the message
    window.open(`https://wa.me/50433135869?text=${message}`);

    // Clear cart
    cart = [];
    updateCartCount();
    showProducts();
    showNotification('¡Gracias por tu pedido!', 'success');
}

// Zoom modal functions
function openZoomModal(imageUrl, imageName) {
    // Create modal HTML
    const modalHtml = `
        <div class="modal-overlay" id="zoom-modal">
            <div class="modal-content zoom-modal-content">
                <div class="zoom-modal-close">&times;</div>
                <img src="${imageUrl}" alt="${imageName}" class="zoom-modal-image">
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add zoom and pan functionality to the image
    const img = document.querySelector('.zoom-modal-image');
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX, startY;

    function updateTransform() {
        img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    }

    img.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.01;
        const newScale = Math.min(Math.max(0.5, scale + delta), 3);

        // Adjust translation to zoom towards mouse position
        if (newScale !== scale) {
            const rect = img.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const scaleChange = newScale / scale;
            translateX = mouseX - (mouseX - translateX) * scaleChange;
            translateY = mouseY - (mouseY - translateY) * scaleChange;
            scale = newScale;
            updateTransform();
        }
    });

    // Add pan functionality
    img.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        img.style.cursor = 'grabbing';
        e.preventDefault();
    });

    img.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    img.addEventListener('mouseup', () => {
        isDragging = false;
        img.style.cursor = 'grab';
    });

    img.addEventListener('mouseleave', () => {
        isDragging = false;
        img.style.cursor = 'grab';
    });

    // Initialize cursor
    img.style.cursor = 'grab';
}

function closeZoomModal() {
    // Exit full screen if active
    if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE11
            document.msExitFullscreen();
        }
    }

    const modal = document.getElementById('zoom-modal');
    if (modal) {
        modal.remove();
    }
}

// Función para mostrar el modal del producto
function showProductModal(product) {
    const modal = document.getElementById('product-modal');
    const modalImage = document.getElementById('modal-product-image');
    const modalName = document.getElementById('modal-product-name');
    const modalPrice = document.getElementById('modal-product-price');
    const modalDescription = document.getElementById('modal-product-description');

    modalImage.src = product.imageUrl;
    modalName.textContent = product.name;
    modalPrice.textContent = `Precio: L. ${product.price}`;
    modalDescription.textContent = product.description || 'Descripción no disponible';

    modal.classList.remove('hidden');
}

// Función para cerrar el modal
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.add('hidden');
}

// Evento para cerrar el modal al hacer clic en el botón de cerrar
const closeModalButton = document.querySelector('.close-modal');
if (closeModalButton) {
    closeModalButton.addEventListener('click', closeProductModal);
}

// Evento para cerrar el modal al hacer clic fuera del contenido
const modal = document.getElementById('product-modal');
if (modal) {
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeProductModal();
        }
    });
}

// Agregar evento de clic a cada producto
function attachProductClickEvents() {
    const productElements = document.querySelectorAll('.product-grid .product-item');
    productElements.forEach((productElement) => {
        productElement.addEventListener('click', () => {
            const productId = productElement.dataset.productId;
            const product = window.products.find((p) => p.id === productId);
            if (product) {
                showProductModal(product);
            }
        });
    });
}

// Llamar a esta función después de cargar los productos
attachProductClickEvents();

// Función para habilitar pantalla completa
function enableFullScreen(imageElement) {
    if (imageElement.requestFullscreen) {
        imageElement.requestFullscreen();
    } else if (imageElement.webkitRequestFullscreen) { // Safari
        imageElement.webkitRequestFullscreen();
    } else if (imageElement.msRequestFullscreen) { // IE11
        imageElement.msRequestFullscreen();
    }
}

// Agregar evento al botón de pantalla completa
function attachFullScreenEvent() {
    const zoomButton = document.querySelector('.zoom-btn');
    const modalImage = document.getElementById('modal-product-image');

    if (zoomButton && modalImage) {
        zoomButton.addEventListener('click', () => enableFullScreen(modalImage));
    }
}

// Llamar a esta función después de abrir el modal
attachFullScreenEvent();
