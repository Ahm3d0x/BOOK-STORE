// 🔴 تأكد من أن رابط الـ API هو نفسه الرابط الفعال لديك
const API_URL = 'https://script.google.com/macros/s/AKfycbwpAv9y0yekyc-5ESHEetIFYCHhvbwJa-kAPuWyjdrufw7NF0RUIM7kmQG91LOINspx/exec';

// === State ===
let appState = {
    books: [],
    settings: {},
    slider: [],
    cart: [],
    currentView: 'home',
    orders: [],
    currentSlideIndex: 0,
    sliderTimer: null // Variable to hold the timer
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    showToast('جاري الاتصال بالمكتبة...', 'info');
    
    await Promise.all([fetchBooks(), fetchSettings(), fetchSlider(), fetchOrdersForTracking()]);
    
    populateFilters();
    setupFilterListeners();

    loadCartFromStorage();
    renderApp();
    
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');
    if (bookId) {
        router('gallery');
        setTimeout(() => openBookModal(bookId), 500);
    }
});

// === API Calls ===
async function fetchBooks() {
    try {
        const res = await fetch(`${API_URL}?action=getBooks`);
        const data = await res.json();
        appState.books = Array.isArray(data) ? data : [];
    } catch (e) { console.error('Error fetching books'); }
}

async function fetchSettings() {
    try {
        const res = await fetch(`${API_URL}?action=getSettings`);
        appState.settings = await res.json();
        updateSiteBranding();
    } catch (e) { console.error(e); }
}

async function fetchSlider() {
    try {
        const res = await fetch(`${API_URL}?action=getSlider`);
        appState.slider = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchOrdersForTracking() {
    try {
        const res = await fetch(`${API_URL}?action=getOrders`);
        appState.orders = await res.json();
    } catch (e) { console.error('Error fetching orders'); }
}

// === Branding ===
function updateSiteBranding() {
    const s = appState.settings;
    
    // تحديث اسم الموقع
    if(s.site_name) {
        document.title = s.site_name;
        document.querySelectorAll('.site-name-display').forEach(el => el.textContent = s.site_name);
    }

    // تحديث اللوجو (في صفحة من نحن + الناف بار)
    if(s.site_logo) {
        // معالجة الرابط باستخدام دالة getImageUrl ليعمل مع جوجل درايف
        const logoUrl = getImageUrl(s.site_logo); 

        // 1. لوجو صفحة من نحن
        const aboutImg = document.getElementById('about-logo-img');
        const aboutIcon = document.getElementById('about-logo-icon');
        if(aboutImg && aboutIcon) { 
            aboutImg.src = logoUrl; 
            aboutImg.classList.remove('hidden'); 
            aboutIcon.classList.add('hidden'); 
        }

        // 2. لوجو الناف بار (الشريط العلوي)
        const navImg = document.getElementById('nav-logo-img');
        const navIcon = document.getElementById('nav-logo-icon');
        if(navImg && navIcon) {
            navImg.src = logoUrl;
            navImg.classList.remove('hidden');
            navIcon.classList.add('hidden');
        }
    }

    // باقي الكود كما هو...
    if(s.about_text) document.getElementById('about-text').innerHTML = s.about_text.replace(/\n/g, '<br>');
    if(s.privacy_policy) document.getElementById('privacy-text').textContent = s.privacy_policy;
    
    const socialDiv = document.getElementById('social-links');
    if(socialDiv) {
        socialDiv.innerHTML = '';
        const map = { facebook: {icon: 'fa-facebook', color: 'text-blue-500'}, instagram: {icon: 'fa-instagram', color: 'text-pink-500'}, whatsapp: {icon: 'fa-whatsapp', color: 'text-green-500'} };
        for(const [k, v] of Object.entries(s)) {
            if(map[k] && v) socialDiv.innerHTML += `<a href="${v}" target="_blank" class="${map[k].color} hover:scale-125 transition"><i class="fab ${map[k].icon}"></i></a>`;
        }
    }
}
// === Filter Logic ===
function populateFilters() {
    const books = appState.books;
    const categories = [...new Set(books.map(b => b.category).filter(Boolean))].sort();
    const years = [...new Set(books.map(b => b.release_date).filter(Boolean))].sort().reverse();
    const ages = [...new Set(books.map(b => b.age_rating).filter(Boolean))].sort();

    const catSelect = document.getElementById('filter-category');
    const yearSelect = document.getElementById('filter-year');
    const ageSelect = document.getElementById('filter-age');

    categories.forEach(c => catSelect.add(new Option(c, c)));
    years.forEach(y => yearSelect.add(new Option(y, y)));
    ages.forEach(a => ageSelect.add(new Option(a, a)));
}

function setupFilterListeners() {
    const ids = ['search-input', 'filter-category', 'filter-year', 'filter-age'];
    ids.forEach(id => {
        document.getElementById(id).addEventListener('input', renderGallery);
    });
}

// === Stack Slider Logic (Auto Play Added) ===
function renderStackSlider() {
    const container = document.getElementById('hero-slider-container');
    if (!container) return;

    const activeSlides = appState.slider.filter(s => String(s.active).toLowerCase() === 'true');
    
    if(!activeSlides.length) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500 glass rounded-2xl">لا توجد عروض حالياً</div>`;
        return;
    }

    container.innerHTML = activeSlides.map((slide, index) => `
        <div class="card-stack-item glass rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-white/10" id="slide-${index}" 
             style="z-index: ${activeSlides.length - index};">
            <img src="${getImageUrl(slide.image_url)}" class="w-full h-full object-cover mix-blend-overlay" onerror="this.src='https://placehold.co/800x400?text=Offer'">
             <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            <div class="absolute bottom-0 left-0 w-full p-8 md:p-12 flex flex-col items-start">
                <span class="bg-gold text-black px-4 py-1 rounded-full text-xs font-bold mb-4 inline-block shadow-lg uppercase tracking-wider">مميز</span>
                <h2 class="text-4xl md:text-6xl font-black mb-4 leading-tight text-white drop-shadow-2xl">${slide.title}</h2>
                <p class="text-xl text-gray-200 mb-8 max-w-xl drop-shadow-md leading-relaxed">${slide.subtitle || ''}</p>
                ${slide.link ? `<a href="${slide.link}" target="_blank" class="inline-block bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gold transition transform hover:-translate-y-1 shadow-xl">تصفح العرض</a>` : ''}
            </div>
        </div>
    `).join('');
    
    // Add Indicators
    const indContainer = document.getElementById('slider-indicators');
    if(indContainer) {
        indContainer.innerHTML = activeSlides.map((_, i) => 
            `<div class="w-2 h-2 rounded-full transition-all duration-300 ${i===appState.currentSlideIndex ? 'bg-gold w-6' : 'bg-gray-600'}" id="ind-${i}"></div>`
        ).join('');
    }

    updateStackVisuals(activeSlides.length);
    initSwipeGestures(activeSlides.length);
    startAutoSlide(activeSlides.length); // Start Timer
}

// New: Auto Slide Function
function startAutoSlide(total) {
    stopAutoSlide(); // Clear existing
    appState.sliderTimer = setInterval(() => {
        const activeEl = document.getElementById(`slide-${appState.currentSlideIndex}`);
        if(activeEl) {
            // Simulate swipe right animation
            activeEl.style.transition = 'all 0.5s ease-out';
            activeEl.style.transform = `translateX(-800px) rotate(-10deg) opacity(0)`;
            
            setTimeout(() => {
                appState.currentSlideIndex = (appState.currentSlideIndex + 1) % total;
                updateStackVisuals(total);
                updateIndicators();
            }, 300);
        }
    }, 3000); // 3 Seconds
}

function stopAutoSlide() {
    if(appState.sliderTimer) clearInterval(appState.sliderTimer);
}

function updateIndicators() {
    const total = appState.slider.filter(s => String(s.active).toLowerCase() === 'true').length;
    for(let i=0; i<total; i++) {
        const el = document.getElementById(`ind-${i}`);
        if(el) {
            el.className = `w-2 h-2 rounded-full transition-all duration-300 ${i===appState.currentSlideIndex ? 'bg-gold w-6' : 'bg-gray-600'}`;
        }
    }
}

function updateStackVisuals(total) {
    const activeIdx = appState.currentSlideIndex;
    for(let i = 0; i < total; i++) {
        const el = document.getElementById(`slide-${i}`);
        if(!el) continue;
        el.style.transition = 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'; // Ensure smooth reset
        let offset = (i - activeIdx + total) % total; 
        if (offset === 0) {
            el.style.transform = `translateY(0) scale(1)`; el.style.opacity = '1'; el.style.zIndex = '50'; el.style.pointerEvents = 'auto';
        } else if (offset === 1) {
            el.style.transform = `translateY(-20px) scale(0.95)`; el.style.opacity = '0.7'; el.style.zIndex = '40'; el.style.pointerEvents = 'none';
        } else if (offset === 2) {
            el.style.transform = `translateY(-40px) scale(0.90)`; el.style.opacity = '0.4'; el.style.zIndex = '30'; el.style.pointerEvents = 'none';
        } else {
            el.style.transform = `translateY(-60px) scale(0.85)`; el.style.opacity = '0'; el.style.zIndex = '10'; el.style.pointerEvents = 'none';
        }
    }
}

function initSwipeGestures(total) {
    const container = document.getElementById('hero-slider-container');
    if (!container) return; 

    let startX = 0;
    let isDragging = false;

    const pause = () => stopAutoSlide();
    const resume = () => startAutoSlide(total);

    // Mouse/Touch Start -> Stop Timer
    container.addEventListener('touchstart', (e) => { 
        startX = e.touches[0].clientX; isDragging = true; 
        pause(); 
    }, {passive: true});

    container.addEventListener('mousedown', (e) => { 
        startX = e.clientX; isDragging = true; container.style.cursor = 'grabbing'; 
        pause();
    });

    // Move
    container.addEventListener('touchmove', (e) => {
        if(!isDragging) return;
        const diff = e.touches[0].clientX - startX;
        const activeEl = document.getElementById(`slide-${appState.currentSlideIndex}`);
        if(activeEl) activeEl.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg)`;
    }, {passive: true});

    container.addEventListener('mousemove', (e) => {
        if(!isDragging) return;
        e.preventDefault();
        const diff = e.clientX - startX;
        const activeEl = document.getElementById(`slide-${appState.currentSlideIndex}`);
        if(activeEl) activeEl.style.transform = `translateX(${diff}px) rotate(${diff * 0.03}deg)`;
    });

    // End -> Resume Timer
    container.addEventListener('touchend', (e) => {
        if(!isDragging) return;
        handleSwipeEnd(startX, e.changedTouches[0].clientX, total);
        isDragging = false;
        resume();
    });

    container.addEventListener('mouseup', (e) => {
        if(!isDragging) return;
        handleSwipeEnd(startX, e.clientX, total);
        isDragging = false; container.style.cursor = 'grab';
        resume();
    });

    container.addEventListener('mouseleave', () => { 
        if(isDragging) { updateStackVisuals(total); isDragging = false; }
        resume();
    });
}

function handleSwipeEnd(start, end, total) {
    const diff = end - start;
    const threshold = 100;
    const activeEl = document.getElementById(`slide-${appState.currentSlideIndex}`);

    if (Math.abs(diff) > threshold) {
        const direction = diff > 0 ? 1 : -1; // 1 = right (prev), -1 = left (next)
        if(activeEl) {
            activeEl.style.transition = 'all 0.3s ease-out';
            activeEl.style.transform = `translateX(${direction * 500}px) rotate(${direction * 20}deg) opacity(0)`;
        }
        setTimeout(() => {
            // Logic to move next or prev (simplified to always next for stack feeling, or handle prev if needed)
            // For simple stack, we usually just cycle next
            appState.currentSlideIndex = (appState.currentSlideIndex + 1) % total;
            
            if(activeEl) {
                activeEl.style.transition = 'none';
                updateStackVisuals(total);
                updateIndicators();
            } else updateStackVisuals(total);
        }, 200);
    } else updateStackVisuals(total);
}

// === Render Functions ===
function renderApp() {
    renderFeatured();
    renderGallery();
    renderCart();
    if(appState.currentView === 'home') renderStackSlider();
}

function renderFeatured() {
    const container = document.getElementById('featured-books');
    if (!container) return; 

    const featured = [...appState.books].reverse().slice(0, 5);
    
    if (featured.length === 0) {
        container.innerHTML = '<div class="w-full text-center text-gray-500 col-span-5">لا توجد كتب مضافة حديثاً</div>';
        return;
    }

    container.innerHTML = featured.map(book => {
        const p = calculatePrice(book.price, book.discount);
        const isOutOfStock = parseInt(book.stock) <= 0;

        return `
            <div class="min-w-[180px] w-full glass rounded-2xl overflow-hidden cursor-pointer group relative snap-center transition duration-300 border border-white/5 hover:border-gold/30" onclick="openBookModal('${book.id}')">
                <div class="h-64 overflow-hidden relative bg-black/50">
                    <img src="${getImageUrl(book.image_url)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''}" onerror="this.src='https://placehold.co/150x200?text=No+Image'">
                    
                    ${isOutOfStock 
                        ? `<span class="absolute top-2 left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-white/20">نفذت الكمية</span>`
                        : (p.hasDiscount ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md">-${p.percent}%</span>` : '')
                    }

                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                         <i class="fas ${isOutOfStock ? 'fa-ban text-gray-400' : 'fa-eye text-white'} text-3xl drop-shadow-lg"></i>
                    </div>
                </div>
                <div class="p-3">
                    <h4 class="font-bold text-white truncate text-sm mb-1 group-hover:text-gold transition">${book.title}</h4>
                    <div class="flex items-center gap-2">
                        <span class="${isOutOfStock ? 'text-gray-500' : 'text-gold'} font-bold text-sm">${p.final} ج.م</span>
                        ${p.hasDiscount && !isOutOfStock ? `<span class="text-gray-500 text-xs line-through">${p.original}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}


function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return; 

    const term = document.getElementById('search-input').value.toLowerCase();
    const cat = document.getElementById('filter-category').value;
    const year = document.getElementById('filter-year').value;
    const age = document.getElementById('filter-age').value;
    
    const filtered = appState.books.filter(b => {
        const matchesSearch = (b.title + ' ' + b.author).toLowerCase().includes(term);
        const matchesCat = cat === 'all' || b.category === cat;
        const matchesYear = year === 'all' || String(b.release_date) === year;
        const matchesAge = age === 'all' || b.age_rating === age;
        return matchesSearch && matchesCat && matchesYear && matchesAge;
    });

    if(!filtered.length) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-20 text-gray-500 flex flex-col items-center">
                <i class="fas fa-search text-4xl mb-4 text-gray-700"></i>
                <p class="text-lg">لا توجد نتائج مطابقة لبحثك.</p>
                <button onclick="resetFilters()" class="mt-4 text-gold hover:underline">إعادة تعيين الفلاتر</button>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(book => createBookCard(book)).join('');
}

function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-year').value = 'all';
    document.getElementById('filter-age').value = 'all';
    renderGallery();
}

function createBookCard(book) {
    const p = calculatePrice(book.price, book.discount);
    // التحقق من المخزون
    const isOutOfStock = parseInt(book.stock) <= 0;

    return `
        <div class="book-card group relative h-full flex flex-col cursor-pointer" onclick="openBookModal('${book.id}')">
<div class="book-cover-wrapper w-full aspect-square rounded-xl overflow-hidden relative mb-4 shadow-lg border border-white/5">
             <img src="${getImageUrl(book.image_url)}" class="w-full h-full object-cover transition duration-500 ${isOutOfStock ? 'grayscale opacity-70' : ''}" onerror="this.src='https://placehold.co/300x450?text=No+Image'">
                
                ${isOutOfStock 
                    ? `<span class="absolute top-3 right-3 bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded shadow-lg z-20 border border-white/20">نفذت الكمية</span>` 
                    : (p.hasDiscount ? `<span class="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded shadow-lg z-10">خصم ${p.percent}%</span>` : '')
                }

                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                    ${isOutOfStock 
                        ? `<button disabled class="bg-gray-600 text-white w-12 h-12 rounded-full flex items-center justify-center cursor-not-allowed opacity-80">
                             <i class="fas fa-ban text-lg"></i>
                           </button>`
                        : `<button onclick="event.stopPropagation(); addToCart('${book.id}')" class="bg-gold text-black w-12 h-12 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition delay-75 hover:scale-110 shadow-glow">
                             <i class="fas fa-cart-plus text-lg"></i>
                           </button>`
                    }
                    <span class="text-white font-bold text-sm tracking-widest border border-white/30 px-3 py-1 rounded-full">تفاصيل</span>
                </div>
            </div>
            <div class="flex-1 flex flex-col px-1">
                <h3 class="font-bold text-base text-white leading-snug mb-1 group-hover:text-gold transition line-clamp-1">${book.title}</h3>
                <p class="text-xs text-gray-400 mb-2">${book.author}</p>
                <div class="mt-auto flex items-center justify-between border-t border-white/5 pt-2">
                    <div class="flex flex-col">
                         ${p.hasDiscount && !isOutOfStock ? `<span class="text-[10px] text-gray-500 line-through">${p.original}</span>` : ''}
                         <span class="${isOutOfStock ? 'text-gray-500' : 'text-gold'} font-bold text-lg leading-none">${p.final} <small class="text-[10px] text-gray-400">ج.م</small></span>
                    </div>
                    <div class="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400">${book.category || 'عام'}</div>
                </div>
            </div>
        </div>
    `;
}


// === Modal Logic ===
function openBookModal(id) {
    const book = appState.books.find(b => b.id == id);
    if(!book) return;
    
    const p = calculatePrice(book.price, book.discount);
    const modal = document.getElementById('book-modal');
    const content = document.getElementById('book-modal-content');
    
document.getElementById('modal-book-img').src = getImageUrl(book.image_url);
document.getElementById('modal-bg-blur').src = getImageUrl(book.image_url);
    document.getElementById('modal-book-title').textContent = book.title;
    document.getElementById('modal-book-author').textContent = book.author;
    document.getElementById('modal-book-desc').textContent = book.description || 'لا يوجد وصف متاح لهذا الكتاب حالياً.';
    document.getElementById('modal-book-category').textContent = book.category || '-';
    document.getElementById('modal-book-year').textContent = book.release_date || '-';
    document.getElementById('modal-book-age').textContent = book.age_rating || 'الكل';
    document.getElementById('modal-book-date').textContent = book.date_added || '-';
    
const tagsDiv = document.getElementById('modal-book-tags');
if (book.tags) {
    // هذا السطر يقوم بتقسيم النص سواء كان الفاصل (شرطة -) أو (فاصلة ،) أو (فاصلة إنجليزية ,)
    // ويقوم بإزالة المسافات الزائدة
    const tagsList = book.tags.split(/[-،,]/).map(t => t.trim()).filter(t => t);
    
    tagsDiv.innerHTML = tagsList.map(t => `
        <span class="inline-block bg-[#1a1a1a] border border-gold/30 text-gold text-xs px-3 py-1.5 rounded-lg shadow-sm hover:bg-gold/10 transition duration-300 cursor-default">
            ${t}
        </span>
    `).join('');
} else {
    tagsDiv.innerHTML = '';
}
    const priceEl = document.getElementById('modal-book-price');
    const oldPriceEl = document.getElementById('modal-book-old-price');
    const badge = document.getElementById('modal-discount-badge');
    
    priceEl.textContent = p.final;
    if(p.hasDiscount) {
        oldPriceEl.textContent = p.original + ' ج.م';
        oldPriceEl.classList.remove('hidden');
        badge.textContent = `-${p.percent}%`;
        badge.classList.remove('hidden');
    } else {
        oldPriceEl.classList.add('hidden');
        badge.classList.add('hidden');
    }

    const btn = document.getElementById('modal-add-btn');
    const stock = parseInt(book.stock);
    if (stock > 0) {
        btn.disabled = false;
        btn.innerHTML = `<span>إضافة للسلة</span> <i class="fas fa-cart-plus"></i>`;
        btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-600');
        btn.classList.add('bg-white', 'text-black', 'hover:bg-gold');
    } else {
        btn.disabled = true;
        btn.innerHTML = `<span>نفذت الكمية</span> <i class="fas fa-ban"></i>`;
        btn.classList.remove('bg-white', 'text-black', 'hover:bg-gold');
        btn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-600', 'text-white');
    }
    btn.onclick = () => { addToCart(book.id); closeBookModal(); };

    const newUrl = `${window.location.pathname}?bookId=${book.id}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);
}

function closeBookModal() {
    const modal = document.getElementById('book-modal');
    const content = document.getElementById('book-modal-content');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        window.history.pushState({path: window.location.pathname}, '', window.location.pathname);
    }, 300);
}

function shareBook() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => { showToast('تم نسخ رابط الكتاب! 📋', 'success'); });
}

// === Order Tracking ===
document.getElementById('tracking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const orderId = e.target.orderId.value.trim().toUpperCase();
    trackOrder(orderId);
});

function trackOrder(orderId) {
    const resultDiv = document.getElementById('tracking-result');
    const order = appState.orders.find(o => String(o.order_id).toUpperCase() === orderId);

    if(!order) {
        resultDiv.innerHTML = `<div class="text-center text-red-400 py-6"><i class="fas fa-exclamation-circle text-4xl mb-3 opacity-50"></i><p>عذراً، لم يتم العثور على طلب بهذا الرقم.</p></div>`;
        resultDiv.classList.remove('hidden');
        return;
    }

    const steps = [
        { status: 'جديد', label: 'تم الاستلام', icon: 'fa-clipboard-check', date: order.date },
        { status: 'جاري التحضير', label: 'جاري التجهيز', icon: 'fa-box-open', date: order.date_preparing },
        { status: 'تم الشحن', label: 'خرج للشحن', icon: 'fa-shipping-fast', date: order.date_shipped },
        { status: 'تم التسليم', label: 'تم التسليم', icon: 'fa-home', date: order.date_delivered }
    ];

    let timelineHtml = '';
    let isCancelled = order.status.includes('ملغي');

    if(isCancelled) {
        timelineHtml = `
            <div class="bg-red-500/10 text-red-400 p-6 rounded-2xl text-center mb-4 border border-red-500/20">
                <i class="fas fa-ban text-4xl mb-3"></i>
                <h3 class="font-bold text-xl mb-1">تم إلغاء هذا الطلب</h3>
                <p class="text-sm opacity-70">تاريخ الإلغاء: ${order.date_cancelled || '-'}</p>
            </div>
        `;
    } else {
        timelineHtml = `<div class="relative flex flex-col md:flex-row justify-between items-start w-full my-10 px-4">
            <div class="absolute left-8 md:left-0 top-0 md:top-5 w-1 md:w-full h-full md:h-1 bg-gray-800 -z-10 md:mx-4"></div>
        `;
        
        steps.forEach((step) => {
            const isDone = !!step.date;
            const colorClass = isDone ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-[#1a1a1a] text-gray-600 border border-gray-700';
            
            timelineHtml += `
                <div class="flex md:flex-col items-center gap-6 md:gap-3 w-full md:w-auto mb-8 md:mb-0">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${colorClass} z-10 transition-all duration-500">
                        <i class="fas ${step.icon}"></i>
                    </div>
                    <div class="text-left md:text-center flex-1">
                        <p class="font-bold text-sm ${isDone ? 'text-white' : 'text-gray-500'}">${step.label}</p>
                        <p class="text-[10px] text-gray-400 mt-1 font-mono">${step.date ? step.date.split('T')[0] : '--'}</p>
                    </div>
                </div>
            `;
        });
        timelineHtml += `</div>`;
    }

    resultDiv.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-white/10 pb-6 gap-4">
            <div>
                <h3 class="text-2xl font-bold text-white mb-1">تفاصيل الطلب <span class="text-gold font-mono">#${order.order_id}</span></h3>
                <p class="text-sm text-gray-400">الإجمالي: <span class="text-white font-bold">${order.total_price}</span></p>
            </div>
            <div class="bg-gold/10 text-gold border border-gold/20 px-4 py-2 rounded-full text-sm font-bold shadow-glow">${order.status}</div>
        </div>
        ${timelineHtml}
        <div class="bg-white/5 p-5 rounded-xl text-sm border border-white/5">
            <h4 class="text-gray-400 mb-3 uppercase tracking-wider text-xs">المنتجات المطلوبة:</h4>
            <p class="text-gray-200 leading-relaxed font-semibold">${order.items}</p>
        </div>
    `;
    resultDiv.classList.remove('hidden');
}

// === Cart & Checkout ===
function addToCart(id) {
    const book = appState.books.find(b => b.id == id);
    if(!book) return;

    if (parseInt(book.stock) <= 0) {
        showToast('عذراً، لقد نفذت كمية هذا الكتاب! 😔', 'error');
        return;
    }

    const existing = appState.cart.find(i => i.id == id);
    
    // (اختياري) حماية إضافية: منع إضافة كمية أكثر من المتوفرة
    if (existing && existing.qty >= parseInt(book.stock)) {
        showToast('عذراً، لقد وصلت للحد الأقصى من المخزون المتوفر', 'error');
        return;
    }

    if(existing) existing.qty++;
    else appState.cart.push({ ...book, qty: 1 });
    
    saveCart(); renderCart();
    openCart();
    showToast('تمت الإضافة للسلة', 'success');
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-price');
    let total = 0;
    
    if(!appState.cart.length) {
        container.innerHTML = '<div class="text-center py-20 text-gray-500 flex flex-col items-center"><i class="fas fa-shopping-basket text-5xl mb-4 opacity-20"></i><p>السلة فارغة حالياً</p><button onclick="closeCart(); router(\'gallery\')" class="mt-4 text-gold hover:underline">تصفح الكتب</button></div>';
        totalEl.textContent = '0 ج.م';
        document.getElementById('cart-count').textContent = '0';
        document.getElementById('cart-count').classList.add('hidden', 'scale-0');
        return;
    }

    const countEl = document.getElementById('cart-count');
    countEl.textContent = appState.cart.reduce((s,i)=>s+i.qty,0);
    countEl.classList.remove('hidden');
    setTimeout(()=> countEl.classList.remove('scale-0'), 100);

    container.innerHTML = appState.cart.map(item => {
        const p = calculatePrice(item.price, item.discount);
        total += p.final * item.qty;
        return `
            <div class="flex gap-4 bg-white/5 p-3 rounded-xl border border-white/5 relative group hover:bg-white/10 transition">
               <img src="${getImageUrl(item.image_url)}" class="w-16 h-20 object-cover rounded-lg shadow-sm">
                <div class="flex-1 flex flex-col justify-between">
                    <div>
                        <h4 class="font-bold text-sm text-white line-clamp-1 mb-1">${item.title}</h4>
                        <div class="text-gold text-sm font-bold">${p.final} ج.م</div>
                    </div>
                    <div class="flex items-center gap-3 bg-black/40 w-max px-2 py-1 rounded-lg border border-white/5 mt-1">
                        <button onclick="updateQty('${item.id}', -1)" class="text-gray-400 hover:text-white px-1">-</button>
                        <span class="text-sm w-4 text-center font-bold">${item.qty}</span>
                        <button onclick="updateQty('${item.id}', 1)" class="text-gray-400 hover:text-white px-1">+</button>
                    </div>
                </div>
                <button onclick="updateQty('${item.id}', -100)" class="absolute top-3 right-3 text-red-500/50 hover:text-red-500 transition"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
    }).join('');
    totalEl.textContent = total.toFixed(0) + ' ج.م';
    
    const checkSum = document.getElementById('checkout-summary');
    if(checkSum) {
        checkSum.innerHTML = appState.cart.map(i => {
            const p = calculatePrice(i.price, i.discount);
            return `<div class="flex justify-between mb-2 text-sm border-b border-white/5 pb-2 last:border-0">
                <span class="text-gray-300">${i.title} <span class="text-gray-500 text-xs">x${i.qty}</span></span>
                <span class="font-bold text-white">${p.final * i.qty}</span>
            </div>`;
        }).join('');
        document.getElementById('checkout-total').textContent = total.toFixed(0) + ' ج.م';
    }
}

document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!appState.cart.length) return showToast('السلة فارغة', 'error');
    const btn = e.target.querySelector('button');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> جاري المعالجة...';
    btn.disabled = true;
    btn.classList.add('opacity-70');

    try {
        const fd = new FormData(e.target);
        const priceText = document.getElementById('checkout-total').textContent;
        const itemsStr = appState.cart.map(i => `${i.title} (x${i.qty})`).join(' | ');
        const now = new Date().toLocaleString('en-GB'); // الوقت الحالي للتحديث الفوري

const order = {
            customer_name: fd.get('name'),
            phone: fd.get('phone'),
            email: fd.get('email'),
            address: fd.get('address') + (fd.get('notes') ? ` | ملاحظات: ${fd.get('notes')}` : ''),
            items: itemsStr,
            total_price: priceText,
            status: 'جديد',
            // --- الإضافة الجديدة هنا ---
            cartData: JSON.stringify(appState.cart), // إرسال بيانات السلة للخصم من المخزون
            // ------------------------
            action: 'placeOrder'
        };
        
        // إرسال الطلب
        const res = await fetch(`${API_URL}?action=placeOrder`, { 
            method: 'POST', 
            body: JSON.stringify(order) 
        });
        
        const result = await res.json();
        
        if(result.success) {
            // === التحديث الفوري للبيانات محلياً (هنا الإضافة الجديدة) ===
            const newLocalOrder = {
                order_id: result.orderId,
                status: 'جديد',
                total_price: order.total_price,
                items: order.items,
                date: now,           // لكي يظهر في التتبع فوراً
                date_preparing: '',
                date_shipped: '',
                date_delivered: '',
                date_cancelled: ''
            };
            appState.orders.push(newLocalOrder); // إضافة الطلب لقائمة الطلبات المحملة
            // ========================================================

            document.getElementById('success-order-id').textContent = result.orderId;
            document.getElementById('success-modal').classList.remove('hidden');
            appState.cart = [];
            saveCart(); renderCart();
            e.target.reset();
        } else {
            throw new Error(result.error || 'حدث خطأ غير معروف');
        }
    } catch(err) {
        console.error(err);
        showToast('فشل إتمام الطلب: تأكد من الاتصال بالإنترنت', 'error');
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
        btn.classList.remove('opacity-70');
    }
});

// === Utilities ===
function calculatePrice(p, d) {
    const price = parseFloat(p) || 0;
    const discount = parseFloat(d) || 0;
    const final = price - discount;
    return { original: price, discount: discount, final: final > 0 ? final : 0, hasDiscount: discount > 0, percent: discount > 0 ? Math.round((discount/price)*100) : 0 };
}

function showToast(msg, type='info') {
    const box = document.getElementById('toast-container');
    const el = document.createElement('div');
    const colors = { 
        success: 'border-green-500 bg-green-900/80 shadow-[0_5px_15px_rgba(34,197,94,0.3)]', 
        error: 'border-red-500 bg-red-900/80 shadow-[0_5px_15px_rgba(239,68,68,0.3)]', 
        info: 'border-blue-500 bg-blue-900/80 shadow-[0_5px_15px_rgba(59,130,246,0.3)]' 
    };
    el.className = `p-4 rounded-xl shadow-2xl border-r-4 ${colors[type]} text-white flex items-center gap-3 slide-in backdrop-blur-md min-w-[300px] z-50`;
    el.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-times-circle':'fa-info-circle'} text-xl"></i> <span class="font-bold">${msg}</span>`;
    box.appendChild(el);
    setTimeout(() => { 
        el.style.transition = 'all 0.5s ease';
        el.style.opacity='0'; 
        el.style.transform='translateX(-20px)';
        setTimeout(()=>el.remove(),500); 
    }, 3000);
}

function copyOrderId() {
    const id = document.getElementById('success-order-id').textContent;
    navigator.clipboard.writeText(id).then(() => showToast('تم نسخ رقم الطلب', 'success'));
}

// Router & Nav
function router(view) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('slide-in'); 
    });
    
    // إيقاف السلايدر إذا خرجنا من الصفحة الرئيسية
    if (view !== 'home') stopAutoSlide();

    const target = document.getElementById(view + '-view');
    target.classList.remove('hidden');
    void target.offsetWidth; 
    target.classList.add('slide-in');
    
    appState.currentView = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update nav state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('text-gold', 'bg-white/10'));

    if(view === 'gallery') {
        renderGallery();
    } else if (view === 'home') {
        renderStackSlider();
        renderFeatured();
    }
}

function openCart() { document.getElementById('cart-modal').classList.remove('-translate-x-full'); }
function closeCart() { document.getElementById('cart-modal').classList.add('-translate-x-full'); }
function toggleMobileMenu() { 
    const m = document.getElementById('mobile-menu');
    m.classList.toggle('hidden');
    if(!m.classList.contains('hidden')) setTimeout(()=>m.classList.remove('translate-y-full'),10);
    else m.classList.add('translate-y-full');
}
function updateQty(id, d) {
    const i = appState.cart.find(x => x.id == id);
    if(i) { i.qty += d; if(i.qty <= 0) appState.cart = appState.cart.filter(x => x.id != id); }
    saveCart(); renderCart();
}
function saveCart() { localStorage.setItem('cart', JSON.stringify(appState.cart)); }
function loadCartFromStorage() { appState.cart = JSON.parse(localStorage.getItem('cart') || '[]'); renderCart(); }
function getImageUrl(url) {
    if (!url) return 'https://placehold.co/300x450?text=No+Image';
    
    // استخراج ID الملف سواء كان الرابط يحتوي على /d/ أو id=
    let id = '';
    
    // الحالة الأولى: رابط مشاركة عادي (.../d/ID/...)
    const part1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (part1 && part1[1]) id = part1[1];
    
    // الحالة الثانية: رابط مباشر (...?id=ID)
    if (!id) {
        const part2 = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (part2 && part2[1]) id = part2[1];
    }

    // إذا وجدنا الـ ID، نستخدم رابط lh3 السريع
    if (id) {
        return `https://lh3.googleusercontent.com/d/${id}`;
    }
    
    return url;
}