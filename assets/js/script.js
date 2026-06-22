// =====================================================
//  M&M DRINK LIQUOR - CATÁLOGO PREMIUM
// =====================================================

var menuProducts = [];
var currentCategory = 'all';
var currentPage = 1;
var searchQuery = '';
var itemsPerPage = 12;
var cart = [];
var imageCache = {};
var dailyDrink = null;
var PAGE_LOAD_TIMESTAMP = Date.now();
var isMobile = window.matchMedia('(max-width: 767px)').matches;
var DEFAULT_WHATSAPP = '18294481651';

function hideCinematicOverlay() {
    var overlay = document.getElementById('cinematic-overlay');
    if (overlay) {
        setTimeout(function() {
            overlay.classList.add('hidden');
            setTimeout(function() {
                overlay.style.display = 'none';
                document.body.style.overflow = 'auto';
                if (typeof AOS !== 'undefined') AOS.refresh();
            }, 800);
        }, 1500);
    }
}

function escapeHtml(s) {
    if (typeof s !== 'string') return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
}

function getProductImage(item) {
    var key = item.id;
    if (imageCache[key] !== undefined) return imageCache[key];
    if (item.imagen && item.imagen.trim() !== '' && item.imagen !== 'null' && item.imagen !== 'undefined') {
        var url = item.imagen.trim();
        if (url.indexOf('http://') === 0) {
            url = 'https://' + url.substring(7);
        }
        var sep = url.indexOf('?') !== -1 ? '&' : '?';
        url = url + sep + '_t=' + PAGE_LOAD_TIMESTAMP;
        imageCache[key] = url;
        return url;
    }
    imageCache[key] = null;
    return null;
}

function handleImageError(img) {
    if (img.dataset.retried === 'true') {
        img.style.display = 'none';
        var parent = img.parentElement;
        if (parent) {
            var noImage = parent.querySelector('.no-image-text');
            if (noImage) noImage.style.display = 'flex';
        }
        return;
    }
    img.dataset.retried = 'true';
    var src = img.getAttribute('src');
    if (src) {
        img.src = src.split('?')[0] + '?_retry=' + Date.now();
    }
}

function handleCartImageError(img) {
    if (img.dataset.retried === 'true') {
        img.style.display = 'none';
        var parent = img.parentElement;
        if (parent) {
            var noImage = parent.querySelector('.cart-no-image');
            if (noImage) noImage.style.display = 'flex';
        }
        return;
    }
    img.dataset.retried = 'true';
    var src = img.getAttribute('src');
    if (src) {
        img.src = src.split('?')[0] + '?_retry=' + Date.now();
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

function groupProductsWithGlass(products) {
    var grouped = {};
    var glassProducts = [];
    var normalProducts = [];

    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        if (p.nombre && (p.nombre.toLowerCase().indexOf('+ vaso') !== -1 || p.nombre.toLowerCase().indexOf('con vaso') !== -1)) {
            glassProducts.push(p);
        } else {
            normalProducts.push(p);
        }
    }

    for (var j = 0; j < glassProducts.length; j++) {
        var p2 = glassProducts[j];
        var baseName = p2.nombre.replace(/\s*\+\s*vaso/i, '').replace(/\s*con\s*vaso/i, '').trim();
        if (!baseName || baseName.toLowerCase() === 'vaso') {
            baseName = p2.nombre;
        }

        if (!grouped[baseName]) {
            grouped[baseName] = {
                id: p2.id,
                nombre: baseName,
                categoria: p2.categoria,
                imagen: p2.imagen,
                es_oferta: p2.es_oferta || false,
                disponible: p2.disponible !== false,
                precio_sin_vaso: null,
                precio_con_vaso: null,
                id_sin_vaso: null,
                id_con_vaso: null,
                tiene_vaso: true,
                productos: []
            };
        }

        if (p2.nombre.toLowerCase().indexOf('+ vaso') !== -1 || p2.nombre.toLowerCase().indexOf('con vaso') !== -1) {
            grouped[baseName].precio_con_vaso = p2.precio;
            grouped[baseName].id_con_vaso = p2.id;
        } else {
            grouped[baseName].precio_sin_vaso = p2.precio;
            grouped[baseName].id_sin_vaso = p2.id;
        }

        grouped[baseName].productos.push(p2);
    }

    var groupedArray = [];
    for (var key in grouped) {
        if (grouped.hasOwnProperty(key)) {
            var g = grouped[key];
            if (g.precio_con_vaso !== null || g.precio_sin_vaso !== null) {
                groupedArray.push(g);
            }
        }
    }

    for (var k = 0; k < groupedArray.length; k++) {
        var g2 = groupedArray[k];
        if (g2.precio_sin_vaso === null && g2.precio_con_vaso !== null) {
            g2.precio_sin_vaso = g2.precio_con_vaso;
            g2.id_sin_vaso = g2.id_con_vaso;
        }
        if (g2.precio_con_vaso === null && g2.precio_sin_vaso !== null) {
            g2.precio_con_vaso = g2.precio_sin_vaso;
            g2.id_con_vaso = g2.id_sin_vaso;
        }
        g2.precio = g2.precio_sin_vaso;
        g2.id = g2.id_sin_vaso;
    }

    return normalProducts.concat(groupedArray);
}

// ============ CARGAR PRODUCTOS ============
async function loadProducts() {
    try {
        renderSkeletons(8);

        var res = await fetch('/api/productos', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!res.ok) {
            throw new Error('HTTP ' + res.status);
        }

        var data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Sin productos');
        }

        menuProducts = groupProductsWithGlass(data);

        renderCategories();
        setTimeout(function() { selectDailyDrink(); }, 100);
        applyFilters();
        hideCinematicOverlay();

    } catch (e) {
        console.error('Error:', e);
        hideCinematicOverlay();
        var grid = document.getElementById('products-grid');
        if (grid) {
            grid.innerHTML = '<div class="col-span-full text-center py-12 sm:py-16 text-gray-500">' +
                '<i class="fa-solid fa-wifi-slash text-2xl sm:text-3xl block mb-3 sm:mb-4 opacity-30"></i>' +
                '<p class="text-sm sm:text-base">Error al cargar catálogo</p>' +
                '<p class="text-xs text-gray-600 mt-2">' + (e.message || 'Error') + '</p>' +
                '<button onclick="location.reload()" class="mt-4 bg-gold-400 text-black px-6 py-2 rounded-full font-bold hover:bg-gold-500 transition-all">' +
                '<i class="fas fa-sync mr-2"></i> Reintentar</button></div>';
        }
    }
}

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
        var tieneImagen = imgUrl && imgUrl.trim() !== '';

        img.style.display = 'block';
        var parent = img.parentElement;
        var noImage = parent.querySelector('.daily-no-image');
        if (noImage) noImage.remove();

        if (tieneImagen) {
            img.src = imgUrl;
            img.alt = dailyDrink.nombre || '';
            img.style.display = 'block';
            img.referrerPolicy = 'no-referrer';
            img.onerror = function() {
                this.style.display = 'none';
                showDailyNoImage(parent);
            };
        } else {
            img.style.display = 'none';
            showDailyNoImage(parent);
        }
    }

    if (addBtn) {
        addBtn.onclick = function() {
            if (dailyDrink) addToCart(dailyDrink.id);
        };
    }
}

function showDailyNoImage(parent) {
    var noImage = parent.querySelector('.daily-no-image');
    if (!noImage) {
        noImage = document.createElement('div');
        noImage.className = 'daily-no-image';
        noImage.innerHTML = '<span>\uD83D\uDDBC\uFE0F</span><p>No hay imagen<br>disponible</p>';
        parent.appendChild(noImage);
    }
    noImage.style.display = 'flex';
}

function renderCategories() {
    var container = document.getElementById('categories-scroll');
    if (!container) return;

    var catSet = {};
    for (var i = 0; i < menuProducts.length; i++) {
        var c = menuProducts[i].categoria;
        if (c) catSet[c] = true;
    }
    var cats = ['all'];
    for (var key in catSet) {
        if (catSet.hasOwnProperty(key)) cats.push(key);
    }

    var html = '';
    for (var j = 0; j < cats.length; j++) {
        var cat = cats[j];
        var label = cat === 'all' ? '\u2B50 Todos' : cat;
        var isActive = cat === currentCategory;
        html += '<button onclick="filterCategory(\'' + cat.replace(/'/g, "\\'") + '\')" class="cat-btn-custom' + (isActive ? ' active' : '') + '" data-cat="' + escapeHtml(cat) + '">' + escapeHtml(label) + '</button>';
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
        if (currentCategory !== 'all' && p.categoria !== currentCategory) continue;
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
            var tieneVaso = prod.tiene_vaso === true;
            var precioSinVaso = prod.precio_sin_vaso || prod.precio;
            var precioConVaso = prod.precio_con_vaso || prod.precio;
            var tieneAmbasOpciones = tieneVaso && ((prod.id_sin_vaso && prod.id_con_vaso) || (prod.precio_sin_vaso && prod.precio_con_vaso));
            var tieneImagen = img && img.trim() !== '';
            var delay = Math.min(i * 40, 300);
            var nombreSeguro = escapeHtml(prod.nombre);
            var catSeguro = escapeHtml(prod.categoria);

            html += '<div class="product-card" data-aos="fade-up" data-aos-duration="500" data-aos-delay="' + delay + '">';
            html += '<div class="img-wrap">';

            if (tieneImagen) {
                html += '<img src="' + img + '" alt="' + nombreSeguro + '"';
                if (!isMobile) html += ' loading="lazy"';
                html += ' referrerpolicy="no-referrer" onerror="handleImageError(this)" />';
            }

            html += '<div class="no-image-text" style="' + (tieneImagen ? 'display:none;' : 'display:flex;') + '"><span>\uD83D\uDDBC\uFE0F</span><p>No hay imagen<br>disponible</p></div>';

            if (tieneVaso) html += '<span class="badge-vaso">\uD83E\uDD54 +Vaso</span>';

            html += '</div>';
            html += '<span class="category-tag">' + catSeguro + '</span>';
            html += '<h4 class="product-name">' + nombreSeguro + '</h4>';

            if (tieneAmbasOpciones) {
                html += '<div class="mt-2 flex flex-col gap-1.5">';
                html += '<div class="flex items-center justify-between text-xs"><span class="text-gray-400">Sin vaso</span><span class="text-white font-semibold">RD$ ' + formatPrice(precioSinVaso) + '</span><button onclick="addToCartWithGlass(' + (prod.id_sin_vaso || prod.id) + ', false)" class="add-btn-small">+</button></div>';
                html += '<div class="flex items-center justify-between text-xs border-t border-white/5 pt-1.5"><span class="text-gray-400">Con vaso \uD83E\uDD54</span><span class="text-gold-400 font-semibold">RD$ ' + formatPrice(precioConVaso) + '</span><button onclick="addToCartWithGlass(' + (prod.id_con_vaso || prod.id) + ', true)" class="add-btn-small gold">+</button></div>';
                html += '</div>';
            } else {
                html += '<div class="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/5"><span class="price">RD$ ' + formatPrice(prod.precio) + '</span><button onclick="addToCart(' + prod.id + ')" class="add-btn"><i class="fa-solid fa-plus text-xs sm:text-sm"></i></button></div>';
            }

            html += '</div>';
        }

        grid.innerHTML = html;
        renderPagination(total);
        if (typeof AOS !== 'undefined') AOS.refresh();

    } catch (e) {
        console.error('Error render:', e);
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

function renderPagination(total) {
    var container = document.getElementById('paginationContainer');
    if (!container) return;

    var pages = Math.ceil(total / itemsPerPage) || 1;
    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<div class="flex items-center justify-center gap-3 sm:gap-4 pt-6 sm:pt-8">' +
        '<button onclick="changePage(' + (currentPage - 1) + ')"' + (currentPage === 1 ? ' disabled' : '') + ' class="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-all duration-300 hover:scale-105 text-xs sm:text-sm font-medium">\u2190 Anterior</button>' +
        '<span class="text-xs sm:text-sm text-gray-400">' + currentPage + ' / ' + pages + '</span>' +
        '<button onclick="changePage(' + (currentPage + 1) + ')"' + (currentPage === pages ? ' disabled' : '') + ' class="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-all duration-300 hover:scale-105 text-xs sm:text-sm font-medium">Siguiente \u2192</button></div>';
}

function changePage(page) {
    currentPage = page;
    applyFilters();
    var el = document.getElementById('catalogo');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

var searchTimeout;

function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchQuery = e.target.value;
    searchTimeout = setTimeout(function() {
        currentPage = 1;
        applyFilters();
    }, 300);
}

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
    showToast('"' + item.nombre + '" a\u00f1adido');
}

function addToCartWithGlass(id, conVaso) {
    var item = null;
    for (var i = 0; i < menuProducts.length; i++) {
        if (menuProducts[i].id === Number(id)) { item = menuProducts[i]; break; }
    }

    if (!item) {
        for (var j = 0; j < menuProducts.length; j++) {
            var p = menuProducts[j];
            if (p.id_sin_vaso === Number(id) || p.id_con_vaso === Number(id)) {
                item = p;
                break;
            }
        }
    }

    if (!item) return;

    var nombreMostrar = item.nombre;
    if (item.tiene_vaso) {
        nombreMostrar = conVaso ? item.nombre + ' + Vaso \uD83E\uDD54' : item.nombre + ' (sin vaso)';
    }

    var precio = item.precio;
    if (item.tiene_vaso) {
        precio = conVaso ? (item.precio_con_vaso || item.precio) : (item.precio_sin_vaso || item.precio);
    }

    var cartItem = {
        id: Number(id),
        nombre: nombreMostrar,
        categoria: item.categoria,
        imagen: item.imagen,
        precio: precio,
        es_oferta: item.es_oferta || false,
        quantity: 1,
        tiene_vaso: item.tiene_vaso || false,
        con_vaso: conVaso || false,
        id_original: item.id_original || id
    };

    var existing = null;
    for (var k = 0; k < cart.length; k++) {
        if (cart[k].id === Number(id)) { existing = cart[k]; break; }
    }

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push(cartItem);
    }

    updateCartUI();
    saveCartData();
    showToast('"' + nombreMostrar + '" a\u00f1adido');
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
            container.innerHTML = '<div class="text-center py-8 sm:py-12 text-gray-500 space-y-2 sm:space-y-3"><i class="fa-solid fa-wine-bottle text-3xl sm:text-4xl block opacity-20"></i><p class="text-sm sm:text-base">El carrito est\u00e1 vac\u00edo</p></div>';
            return;
        }

        var html = '';
        for (var j = 0; j < cart.length; j++) {
            var item = cart[j];
            var img = getProductImage(item);
            var tieneImagen = img && img.trim() !== '';
            var esConVaso = item.con_vaso === true;
            var nombreSeguro = escapeHtml(item.nombre);

            html += '<div class="cart-item flex items-center space-x-3 sm:space-x-4 bg-white/[0.02] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/[0.04]" style="animation-delay: ' + (j * 40) + 'ms">';

            if (tieneImagen) {
                html += '<img src="' + img + '" alt="' + nombreSeguro + '" class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover" referrerpolicy="no-referrer" onerror="handleCartImageError(this)" />';
            }

            html += '<div class="cart-no-image" style="' + (tieneImagen ? 'display:none;' : 'display:flex;') + ' width:40px; height:40px; border-radius:8px; background:#0a0a0f; align-items:center; justify-content:center; flex-shrink:0; font-size:10px; color:#555; text-align:center; flex-direction:column; line-height:1.2;"><span>\uD83D\uDDBC\uFE0F</span><span style="font-size:6px;">sin img</span></div>';
            html += '<div class="flex-1 min-w-0"><h5 class="text-xs sm:text-sm font-bold text-white truncate">' + nombreSeguro + '</h5><p class="text-[10px] sm:text-xs text-gold-400">RD$ ' + formatPrice(item.precio) + ' x ' + item.quantity + (esConVaso ? ' \uD83E\uDD54' : '') + '</p></div>';
            html += '<div class="flex items-center space-x-1 sm:space-x-2">';
            html += '<button onclick="updateCartQuantity(' + item.id + ', -1)" class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-all duration-300 hover:scale-110 text-xs sm:text-sm">\u2212</button>';
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

function openNameModal() {
    if (cart.length === 0) { showToast("Agrega productos primero"); return; }
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

function confirmSendOrder() {
    var nameInput = document.getElementById('customerName');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) { alert('Ingresa tu nombre'); return; }

    var message = '*NUEVO PEDIDO - M&M DRINK LIQUOR*\n*Cliente:* ' + name + '\n-------------------------------------------\n';
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var conVaso = item.con_vaso ? ' \uD83E\uDD54 con vaso' : '';
        message += '\u2022 ' + item.quantity + 'x ' + item.nombre + conVaso + '\n  Subtotal: RD$ ' + formatPrice(item.precio * item.quantity) + '\n';
    }
    var total = 0;
    for (var j = 0; j < cart.length; j++) { total += cart[j].precio * cart[j].quantity; }
    message += '-------------------------------------------\n*TOTAL:* RD$ ' + formatPrice(total) + '\n\n_Para confirmar disponibilidad y env\u00edo._';

    var url = 'https://wa.me/' + DEFAULT_WHATSAPP + '?text=' + encodeURIComponent(message);
    cart = [];
    saveCartData();
    updateCartUI();
    closeNameModal();
    toggleCartModal();
    window.open(url, '_blank');
    showToast('Pedido enviado \u2705');
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
    var message = '\uD83C\uDF77 \u00a1Mira el cat\u00e1logo de M&M Drink Liquor! \uD83C\uDF77\n\nElige tus bebidas favoritas, arma tu pedido y rec\u00edbelo donde est\u00e9s en Santo Domingo.\n\n\uD83D\uDCF1 ' + url + '\n\n\uD83D\uDD25 \u00a1Pide ahora por WhatsApp!';
    if (navigator.share) {
        navigator.share({ title: 'M&M Drink Liquor \u00b7 Cat\u00e1logo Premium', text: '\uD83C\uDF77 \u00a1Mira el cat\u00e1logo de M&M Drink Liquor!', url: url }).catch(function() {});
    } else {
        try {
            navigator.clipboard.writeText(message).then(function() { showToast('\uD83D\uDCCB \u00a1Enlace copiado!'); }).catch(function() { window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank'); });
        } catch(e) { window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank'); }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 600, easing: 'ease-out-cubic', once: true, offset: 30, disable: isMobile });
    }
    renderSkeletons(8);
    loadProducts();
    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', handleSearch);
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    try {
        var saved = localStorage.getItem('mymCart_v2');
        if (saved) { cart = JSON.parse(saved); if (!Array.isArray(cart)) cart = []; }
    } catch(e) { cart = []; }
    setTimeout(function() { updateCartUI(); }, 150);
});