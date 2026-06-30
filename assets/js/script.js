// =====================================================
//  M&M DRINK LIQUOR
// =====================================================

// =====================================================
//  CONFIGURACIÓN
// =====================================================

const SUPABASE_URL = 'https://mflamrkyqjipbbjevfgv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGFtcmt5cWppcGJiamV2Zmd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDc2NzgsImV4cCI6MjA5NzU4MzY3OH0.ASKpXVxk5nuaoZqGi5P9TuM55Lurju8BZbdK0fPVUB8';

var menuProducts = [];
var currentCategory = 'all';
var currentPage = 1;
var searchQuery = '';
var itemsPerPage = 12;
var cart = [];
var imageCache = {};
var dailyDrink = null;
var PAGE_LOAD_TIMESTAMP = Date.now();
var DEFAULT_WHATSAPP = '18098968356';
var supabaseClient = null;
var isMobile = window.matchMedia('(max-width: 767px)').matches;
var selectedPaymentMethod = '';

// =====================================================
//  INICIALIZAR SUPABASE
// =====================================================

function initSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return true;
    }
    return false;
}

if (!initSupabase()) {
    var checkInterval = setInterval(function() {
        if (typeof supabase !== 'undefined') {
            clearInterval(checkInterval);
            initSupabase();
            if (menuProducts.length > 0) {
                loadProducts();
            }
        }
    }, 500);
}

// =====================================================
//  FUNCIONES DE IMÁGENES
// =====================================================

function getAbsoluteUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('//')) return 'https:' + path;
    var baseUrl = window.location.origin;
    if (!path.startsWith('/')) path = '/' + path;
    path = path.replace(/\/\//g, '/');
    return baseUrl + path;
}

function getProductImage(item) {
    var key = item.id;
    if (imageCache[key] !== undefined) return imageCache[key];
    if (item.imagen && item.imagen.trim() !== '' && item.imagen !== 'null' && item.imagen !== 'undefined') {
        var url = item.imagen.trim();
        var absoluteUrl = getAbsoluteUrl(url);
        if (absoluteUrl) {
            var finalUrl = absoluteUrl + '?_t=' + Date.now() + '&_r=' + Math.random().toString(36).substr(2, 5);
            imageCache[key] = finalUrl;
            return finalUrl;
        }
    }
    var placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%231a1a2e"/%3E%3Ctext x="100" y="90" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="50" fill="%23444"%3E🍷%3C/text%3E%3Ctext x="100" y="125" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="14" fill="%23555"%3ESin imagen%3C/text%3E%3C/svg%3E';
    imageCache[key] = placeholder;
    return placeholder;
}

function handleImageError(img) {
    if (!img) return;
    var placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%231a1a2e"/%3E%3Ctext x="100" y="90" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="50" fill="%23444"%3E🍷%3C/text%3E%3Ctext x="100" y="125" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="14" fill="%23555"%3ESin imagen%3C/text%3E%3C/svg%3E';
    img.src = placeholder;
    img.onerror = null;
}

function handleCartImageError(img) {
    if (!img) return;
    var placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%231a1a2e"/%3E%3Ctext x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="30" fill="%23444"%3E🍷%3C/text%3E%3C/svg%3E';
    img.src = placeholder;
    img.onerror = null;
}

// =====================================================
//  FUNCIONES BASE
// =====================================================

function escapeHtml(s) {
    if (typeof s !== 'string') return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
}

function hideCinematicOverlay() {
    var overlay = document.getElementById('cinematic-overlay');
    if (overlay) {
        setTimeout(function() {
            overlay.classList.add('hidden');
            setTimeout(function() {
                overlay.style.display = 'none';
                document.body.style.overflow = 'auto';
                if (typeof AOS !== 'undefined') {
                    AOS.refresh();
                }
                if (typeof window.forceLoadAllImages === 'function') {
                    setTimeout(window.forceLoadAllImages, 300);
                }
            }, 1200);
        }, 2000);
    }
}

function renderSkeletons(count) {
    var grid = document.getElementById('products-grid');
    if (!grid) return;
    var n = count || 8;
    var s = '';
    for (var i = 0; i < n; i++) {
        s += '<div class="skeleton"></div>';
    }
    grid.innerHTML = s;
}

function formatPrice(val) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return Number(val).toLocaleString();
}

// =====================================================
//  CARGAR PRODUCTOS
// =====================================================

async function loadProducts() {
    try {
        renderSkeletons(8);
        if (!supabaseClient) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (!supabaseClient) {
                initSupabase();
                if (!supabaseClient) {
                    throw new Error('Supabase no disponible');
                }
            }
        }
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .order('id', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('No hay productos en la base de datos');
        }
        menuProducts = data;
        window.menuProducts = menuProducts;
        renderCategories();
        setTimeout(function() { selectDailyDrink(); }, 100);
        applyFilters();
        hideCinematicOverlay();
    } catch (e) {
        hideCinematicOverlay();
        var grid = document.getElementById('products-grid');
        if (grid) {
            grid.innerHTML = '<div class="col-span-full text-center py-12 sm:py-16 text-gray-500">' +
                '<i class="fa-solid fa-wifi-slash text-2xl sm:text-3xl block mb-3 sm:mb-4 opacity-30"></i>' +
                '<p class="text-sm sm:text-base">Error al cargar catálogo</p>' +
                '<p class="text-xs text-gray-600 mt-2">' + (e.message || 'Error al cargar') + '</p>' +
                '<div class="mt-4 flex flex-wrap justify-center gap-3">' +
                '<button onclick="location.reload()" class="bg-gold-400 text-black px-6 py-2 rounded-full font-bold hover:bg-gold-500 transition-all">' +
                '<i class="fas fa-sync mr-2"></i> Reintentar</button></div></div>';
        }
    }
}

// =====================================================
//  BEBIDA DEL DÍA
// =====================================================

function selectDailyDrink() {
    if (menuProducts.length === 0) return;
    var today = new Date().toDateString();
    var saved = localStorage.getItem('mymDailyDrink');
    if (saved) {
        try {
            var parsed = JSON.parse(saved);
            if (parsed.date === today && parsed.product) {
                dailyDrink = parsed.product;
                renderDailyDrink();
                return;
            }
        } catch (e) {}
    }
    var randomIndex = Math.floor(Math.random() * menuProducts.length);
    dailyDrink = menuProducts[randomIndex];
    try { localStorage.setItem('mymDailyDrink', JSON.stringify({ date: today, product: dailyDrink })); } catch(e) {}
    renderDailyDrink();
}

function renderDailyDrink() {
    if (!dailyDrink) return;
    var img = document.getElementById('daily-drink-image');
    var name = document.getElementById('daily-drink-name');
    var price = document.getElementById('daily-drink-price');
    var addBtn = document.getElementById('daily-drink-add');
    if (name) name.textContent = dailyDrink.nombre || '';
    if (price) price.textContent = 'RD$ ' + formatPrice(dailyDrink.precio);
    if (img) {
        var imgUrl = getProductImage(dailyDrink);
        img.src = imgUrl;
        img.alt = dailyDrink.nombre || '';
        img.style.display = 'block';
        img.onerror = function() { handleImageError(this); };
    }
    if (addBtn) {
        addBtn.onclick = function() {
            if (dailyDrink) addToCart(dailyDrink.id);
        };
    }
}

// =====================================================
//  CATEGORÍAS
// =====================================================

function renderCategories() {
    var container = document.getElementById('categories-scroll');
    if (!container) return;
    var catSet = {};
    var tieneOfertas = false;
    for (var i = 0; i < menuProducts.length; i++) {
        var c = menuProducts[i].categoria;
        if (c) catSet[c] = true;
        if (menuProducts[i].es_oferta == 1) {
            tieneOfertas = true;
        }
    }
    var cats = ['all'];
    if (tieneOfertas) {
        cats.push('ofertas');
    }
    for (var key in catSet) {
        if (catSet.hasOwnProperty(key)) cats.push(key);
    }
    var html = '';
    for (var j = 0; j < cats.length; j++) {
        var cat = cats[j];
        var label = cat === 'all' ? '⭐ Todos' : (cat === 'ofertas' ? '🔥 Ofertas' : cat);
        var isActive = cat === currentCategory;
        var extraClass = cat === 'ofertas' ? ' oferta-cat' : '';
        html += '<button onclick="filterCategory(\'' + cat.replace(/'/g, "\\'") + '\')" class="cat-btn-custom' + (isActive ? ' active' : '') + extraClass + '" data-cat="' + escapeHtml(cat) + '">' + escapeHtml(label) + '</button>';
    }
    container.innerHTML = html;
    setupCategoryNavigation();
}

function setupCategoryNavigation() {
    var prevBtn = document.getElementById('cat-prev');
    var nextBtn = document.getElementById('cat-next');
    var scroll = document.getElementById('categories-scroll');
    if (!prevBtn || !nextBtn || !scroll) return;
    prevBtn.onclick = function() { scroll.scrollBy({ left: -180, behavior: 'smooth' }); };
    nextBtn.onclick = function() { scroll.scrollBy({ left: 180, behavior: 'smooth' }); };
}

function filterCategory(cat) {
    currentCategory = cat;
    currentPage = 1;
    var btns = document.querySelectorAll('.cat-btn-custom');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('active', btns[i].dataset.cat === cat);
    }
    applyFilters();
}

function applyFilters() {
    var filtered = [];
    for (var i = 0; i < menuProducts.length; i++) {
        var p = menuProducts[i];
        if (currentCategory === 'ofertas') {
            if (p.es_oferta != 1) continue;
        } else if (currentCategory !== 'all' && p.categoria !== currentCategory) {
            continue;
        }
        if (searchQuery) {
            var q = searchQuery.toLowerCase();
            if (p.nombre.toLowerCase().indexOf(q) === -1 && p.categoria.toLowerCase().indexOf(q) === -1) continue;
        }
        filtered.push(p);
    }
    renderProducts(filtered);
}

function renderProducts(allItems) {
    try {
        var grid = document.getElementById('products-grid');
        if (!grid) return;
        var total = allItems.length;
        var start = (currentPage - 1) * itemsPerPage;
        var end = start + itemsPerPage;
        var slice = allItems.slice(start, end);
        if (total === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-12 sm:py-16 text-gray-500"><i class="fa-regular fa-face-frown text-2xl sm:text-3xl block mb-3 sm:mb-4 opacity-30"></i><p class="text-sm sm:text-base">No hay productos</p></div>';
            renderPagination(0);
            return;
        }
        var html = '';
        for (var i = 0; i < slice.length; i++) {
            var prod = slice[i];
            var img = getProductImage(prod);
            var delay = Math.min(i * 40, 300);
            var nombreSeguro = escapeHtml(prod.nombre);
            var catSeguro = escapeHtml(prod.categoria);
            var esOferta = prod.es_oferta == 1;
            html += '<div class="product-card" data-aos="fade-up" data-aos-duration="500" data-aos-delay="' + delay + '">';
            html += '<div class="img-wrap">';
            html += '<img src="' + img + '" alt="' + nombreSeguro + '" onerror="handleImageError(this)" style="min-height:120px;width:100%;background:#1a1a2e;display:block;" />';
            html += '<div class="no-image-text" style="display:none;"><span>🍷</span><p>No hay imagen<br>disponible</p></div>';
            if (esOferta) html += '<span class="badge-vaso oferta">🔥 Oferta</span>';
            html += '</div>';
            html += '<span class="category-tag">' + catSeguro + '</span>';
            html += '<h4 class="product-name">' + nombreSeguro + '</h4>';
            html += '<div class="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/5"><span class="price">RD$ ' + formatPrice(prod.precio) + '</span><button onclick="addToCart(' + prod.id + ')" class="add-btn"><i class="fa-solid fa-plus text-xs sm:text-sm"></i></button></div>';
            html += '</div>';
        }
        grid.innerHTML = html;
        renderPagination(total);
        if (typeof AOS !== 'undefined') AOS.refresh();
    } catch (e) {
        var g = document.getElementById('products-grid');
        if (g) {
            g.innerHTML = '<div class="col-span-full text-center py-12 sm:py-16 text-gray-500">' +
                '<i class="fa-solid fa-bug text-2xl sm:text-3xl block mb-3 sm:mb-4 opacity-30"></i>' +
                '<p class="text-sm sm:text-base">Error al mostrar productos</p>' +
                '<button onclick="location.reload()" class="mt-4 bg-gold-400 text-black px-6 py-2 rounded-full font-bold hover:bg-gold-500 transition-all">' +
                '<i class="fas fa-sync mr-2"></i> Recargar</button></div>';
        }
    }
}

// =====================================================
//  PAGINACIÓN
// =====================================================

function renderPagination(total) {
    var container = document.getElementById('paginationContainer');
    if (!container) return;
    var pages = Math.ceil(total / itemsPerPage) || 1;
    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = '<div class="flex items-center justify-center gap-3 sm:gap-4 pt-6 sm:pt-8">' +
        '<button onclick="changePage(' + (currentPage - 1) + ')"' + (currentPage === 1 ? ' disabled' : '') + ' class="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-all duration-300 hover:scale-105 text-xs sm:text-sm font-medium">← Anterior</button>' +
        '<span class="text-xs sm:text-sm text-gray-400">' + currentPage + ' / ' + pages + '</span>' +
        '<button onclick="changePage(' + (currentPage + 1) + ')"' + (currentPage === pages ? ' disabled' : '') + ' class="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-all duration-300 hover:scale-105 text-xs sm:text-sm font-medium">Siguiente →</button></div>';
}

function changePage(page) {
    currentPage = page;
    applyFilters();
    var el = document.getElementById('catalogo');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =====================================================
//  BÚSQUEDA
// =====================================================

var searchTimeout;

function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchQuery = e.target.value;
    searchTimeout = setTimeout(function() {
        currentPage = 1;
        applyFilters();
    }, 300);
}

// =====================================================
//  CARRITO
// =====================================================

function addToCart(id) {
    var item = null;
    for (var i = 0; i < menuProducts.length; i++) {
        if (menuProducts[i].id === Number(id)) { item = menuProducts[i]; break; }
    }
    if (!item) return;
    var existing = null;
    for (var j = 0; j < cart.length; j++) {
        if (cart[j].id === Number(id)) { existing = cart[j]; break; }
    }
    if (existing) {
        existing.quantity += 1;
    } else {
        var newItem = {};
        for (var key in item) {
            if (item.hasOwnProperty(key)) newItem[key] = item[key];
        }
        newItem.quantity = 1;
        cart.push(newItem);
    }
    updateCartUI();
    saveCartData();
    showToast('"' + item.nombre + '" añadido');
}

function updateCartQuantity(id, change) {
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === Number(id)) {
            cart[i].quantity += change;
            if (cart[i].quantity <= 0) {
                cart.splice(i, 1);
            }
            break;
        }
    }
    updateCartUI();
    saveCartData();
}

function updateCartUI() {
    var badge = document.getElementById('cart-count');
    var totalText = document.getElementById('cart-total');
    var container = document.getElementById('cart-items-container');
    var totalCount = 0;
    var totalPrice = 0;
    for (var i = 0; i < cart.length; i++) {
        totalCount += cart[i].quantity;
        totalPrice += cart[i].precio * cart[i].quantity;
    }
    if (badge) badge.textContent = totalCount;
    if (totalText) totalText.textContent = 'RD$ ' + formatPrice(totalPrice);
    if (container) {
        if (cart.length === 0) {
            container.innerHTML = '<div class="text-center py-8 sm:py-12 text-gray-500 space-y-2 sm:space-y-3"><i class="fa-solid fa-wine-bottle text-3xl sm:text-4xl block opacity-20"></i><p class="text-sm sm:text-base">El carrito está vacío</p></div>';
            return;
        }
        var html = '';
        for (var j = 0; j < cart.length; j++) {
            var item = cart[j];
            var img = getProductImage(item);
            var nombreSeguro = escapeHtml(item.nombre);
            html += '<div class="cart-item flex items-center space-x-3 sm:space-x-4 bg-white/[0.02] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/[0.04]" style="animation-delay: ' + (j * 40) + 'ms">';
            html += '<img src="' + img + '" alt="' + nombreSeguro + '" class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover" onerror="handleCartImageError(this)" />';
            html += '<div class="flex-1 min-w-0"><h5 class="text-xs sm:text-sm font-bold text-white truncate">' + nombreSeguro + '</h5><p class="text-[10px] sm:text-xs text-gold-400">RD$ ' + formatPrice(item.precio) + ' x ' + item.quantity + '</p></div>';
            html += '<div class="flex items-center space-x-1 sm:space-x-2">';
            html += '<button onclick="updateCartQuantity(' + item.id + ', -1)" class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-all duration-300 hover:scale-110 text-xs sm:text-sm">−</button>';
            html += '<span class="text-xs sm:text-sm w-4 sm:w-5 text-center">' + item.quantity + '</span>';
            html += '<button onclick="updateCartQuantity(' + item.id + ', 1)" class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-all duration-300 hover:scale-110 text-xs sm:text-sm">+</button>';
            html += '</div></div>';
        }
        container.innerHTML = html;
    }
}

function toggleCartModal() {
    var modal = document.getElementById('cart-modal');
    var backdrop = document.getElementById('cart-backdrop');
    var sheet = document.getElementById('cart-sheet');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        requestAnimationFrame(function() {
            if (backdrop) backdrop.classList.replace('opacity-0', 'opacity-100');
            if (sheet) sheet.classList.remove('translate-x-full');
        });
    } else {
        if (backdrop) backdrop.classList.replace('opacity-100', 'opacity-0');
        if (sheet) sheet.classList.add('translate-x-full');
        setTimeout(function() { modal.classList.add('hidden'); }, 400);
    }
}

function saveCartData() {
    try { localStorage.setItem('mymCart_v2', JSON.stringify(cart)); } catch(e) {}
}

// =====================================================
//  MÉTODO DE PAGO
// =====================================================

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    document.getElementById('selectedPayment').value = method;
    var buttons = document.querySelectorAll('.payment-btn');
    buttons.forEach(function(btn) {
        btn.classList.remove('border-gold-400', 'text-white', 'bg-gold-400/10');
        btn.classList.add('text-gray-400');
    });
    var selectedBtn = document.querySelector('.payment-btn[data-method="' + method + '"]');
    if (selectedBtn) {
        selectedBtn.classList.add('border-gold-400', 'text-white', 'bg-gold-400/10');
        selectedBtn.classList.remove('text-gray-400');
    }
}

function confirmSendOrder() {
    var nameInput = document.getElementById('customerName');
    var locationInput = document.getElementById('customerLocation');
    var paymentInput = document.getElementById('selectedPayment');
    var name = nameInput ? nameInput.value.trim() : '';
    var location = locationInput ? locationInput.value.trim() : '';
    var payment = paymentInput ? paymentInput.value : '';
    if (!name) {
        showToast('⚠️ Ingresa tu nombre');
        nameInput.focus();
        return;
    }
    if (!location) {
        showToast('⚠️ Ingresa tu ubicación');
        locationInput.focus();
        return;
    }
    if (!payment) {
        showToast('⚠️ Selecciona un método de pago');
        return;
    }
    if (cart.length === 0) {
        showToast('⚠️ El carrito está vacío');
        return;
    }
    var message = '*NUEVO PEDIDO - M&M DRINK LIQUOR*\n';
    message += '-------------------------------------------\n';
    message += '*Cliente:* ' + name + '\n';
    message += '*Ubicación:* ' + location + '\n';
    message += '*Método de pago:* ' + payment + '\n';
    message += '-------------------------------------------\n';
    message += '*PRODUCTOS:*\n';
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var subtotal = item.precio * item.quantity;
        total += subtotal;
        message += '• ' + item.quantity + 'x ' + item.nombre + '\n';
        message += '  Subtotal: RD$ ' + formatPrice(subtotal) + '\n';
    }
    message += '-------------------------------------------\n';
    message += '*TOTAL:* RD$ ' + formatPrice(total) + '\n';
    message += '-------------------------------------------\n';
    message += '_Para confirmar disponibilidad y envío._';
    var url = 'https://wa.me/' + DEFAULT_WHATSAPP + '?text=' + encodeURIComponent(message);
    cart = [];
    saveCartData();
    updateCartUI();
    closeNameModal();
    toggleCartModal();
    window.open(url, '_blank');
    showToast('✅ Pedido enviado');
}

function openNameModal() {
    if (cart.length === 0) { showToast("Agrega productos primero"); return; }
    selectedPaymentMethod = '';
    document.getElementById('selectedPayment').value = '';
    var buttons = document.querySelectorAll('.payment-btn');
    buttons.forEach(function(btn) {
        btn.classList.remove('border-gold-400', 'text-white', 'bg-gold-400/10');
        btn.classList.add('text-gray-400');
    });
    var modal = document.getElementById('name-modal');
    var content = document.getElementById('name-modal-content');
    if (modal) {
        modal.classList.remove('hidden');
        requestAnimationFrame(function() {
            if (content) {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }
        });
    }
}

function closeNameModal() {
    var modal = document.getElementById('name-modal');
    var content = document.getElementById('name-modal-content');
    if (content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
    }
    setTimeout(function() { if (modal) modal.classList.add('hidden'); }, 400);
}

function showToast(message) {
    var toast = document.getElementById('toast-notification');
    var msgSpan = document.getElementById('toastMessage');
    if (toast && msgSpan) {
        msgSpan.textContent = message;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(function() { toast.classList.remove('show'); }, 2500);
    }
}

function handleHeaderScroll() {
    var header = document.getElementById('main-header');
    if (header) {
        var scrolled = window.scrollY > 50;
        if (scrolled !== header._scrolled) {
            header._scrolled = scrolled;
            header.classList.toggle('scrolled', scrolled);
        }
    }
}

function shareCatalog() {
    var url = window.location.href;
    var message = '🍷 ¡Mira el catálogo de M&M Drink Liquor! 🍷\n\nElige tus bebidas favoritas, arma tu pedido y recíbelo donde estés en Santo Domingo.\n\n📱 ' + url + '\n\n🔥 ¡Pide ahora por WhatsApp!';
    if (navigator.share) {
        navigator.share({ title: 'M&M Drink Liquor · Catálogo Premium', text: '🍷 ¡Mira el catálogo de M&M Drink Liquor!', url: url }).catch(function() {});
    } else {
        try {
            navigator.clipboard.writeText(message).then(function() { showToast('📋 ¡Enlace copiado!'); }).catch(function() { window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank'); });
        } catch(e) { window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank'); }
    }
}

window.forceLoadAllImages = function() {
    var allImages = document.querySelectorAll('.product-card img, .cart-item img, #daily-drink-image');
    allImages.forEach(function(img) {
        var src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src && !src.startsWith('data:image')) {
            var baseUrl = src.split('?')[0];
            var newSrc = baseUrl + '?_t=' + Date.now() + '&_force=' + Math.random().toString(36).substr(2, 5);
            img.removeAttribute('data-src');
            img.src = newSrc;
            img.onerror = function() {
                this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%231a1a2e"/%3E%3Ctext x="100" y="90" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="50" fill="%23444"%3E🍷%3C/text%3E%3Ctext x="100" y="125" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="14" fill="%23555"%3ESin imagen%3C/text%3E%3C/svg%3E';
                this.onerror = null;
            };
        }
    });
};

// =====================================================
//  INICIALIZACIÓN
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ 
            duration: 600, 
            easing: 'ease-out-cubic', 
            once: true, 
            offset: 30,
            disable: isMobile
        });
    }
    renderSkeletons(8);
    loadProducts();
    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    try {
        var saved = localStorage.getItem('mymCart_v2');
        if (saved) { 
            cart = JSON.parse(saved); 
            if (!Array.isArray(cart)) cart = []; 
        }
    } catch(e) { 
        cart = []; 
    }
    setTimeout(function() { 
        updateCartUI(); 
    }, 150);
});

window.menuProducts = menuProducts;
window.forceLoadAllImages = window.forceLoadAllImages || function() {};
