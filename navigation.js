// Variables globales
let currentSection = 'productos';

// Funciones de navegación
function hideAllSections() {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.classList.add('hidden');
        section.style.display = 'none';
    });
}

function showSection(sectionId) {
    hideAllSections();
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
        section.style.display = 'block';
        currentSection = sectionId;
    }
}

function showProducts() {
    showSection('productos');
}

function showCart() {
    showSection('carrito');
    displayCartItems();
}

function showCheckout() {
    // Acceder a cart desde el scope global (definido en script.js)
    if (!window.cart || window.cart.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        showProducts();
        return;
    }
    showSection('checkout');
    updateCartPreview();
}