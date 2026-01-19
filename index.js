// 🔴 تأكد من أن رابط الـ API هو نفسه الرابط الفعال لديك
const API_URL = 'https://script.google.com/macros/s/AKfycbwMpTQXDLuT6I0f6DafkU-gGp2NxiOn2YWysZt12-qboWoOIfhUzklc3Mm25chdNBz3/exec';
let appState = {
    books: [],
    settings: {},
    slider: [],
    cart: [],
    currentView: 'home',
    orders: [],
    currentSlideIndex: 0,
    sliderTimer: null,
    activeCoupon: null
};

const SHIPPING_RATES = {
    "كفر صقر":20,
    "الشرقية": 35,
    "القاهرة": 55,
    "الجيزة": 55,
    "الإسكندرية": 65,
    "الدقهلية": 55,
    "القليوبية": 55,
    "المنوفية": 55,
    "الغربية": 55,
    "بورسعيد": 65,
    "الإسماعيلية": 55,
    "السويس": 65,
    "كفر الشيخ": 65,
    "البحيرة": 65,
    "دمياط": 65,
    "الفيوم": 65,
    "بني سويف": 65,
    "المنيا": 80,
    "أسيوط": 90,
    "سوهاج": 100,
    "قنا": 105,
    "الأقصر": 105,
    "أسوان": 105,
    "مطروح": 90,
    "الوادي الجديد": 105,
    "البحر الأحمر": 100,
    "شمال سيناء": 70,
    "جنوب سيناء": 80
};
// === Init ===
// [index.js] استبدل الجزء العلوي الخاص بالتحميل بهذا الكود الجديد 👇

// [index.js] استبدل الجزء القديم بهذا الكود الجديد لتسريع الموقع 🚀

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // 1. (جديد) التحميل الفوري من الذاكرة المحلية (الكاش)
    // هذا سيجعل الموقع يفتح فوراً للزوار السابقين
    loadFromCache();
    
    // إذا كانت البيانات موجودة في الكاش، نعرض التطبيق فوراً ولا نظهر رسالة الانتظار
    if (appState.books.length > 0) {
        renderApp();
    } else {
        showToast('جاري الاتصال بالمكتبة...', 'info');
    }
    
    // 2. جلب البيانات الحديثة في الخلفية (تحديث صامت)
    // العميل يتصفح الموقع بينما يتم تحديث البيانات
    await Promise.all([fetchBooks(), fetchSettings(), fetchSlider(), fetchOrdersForTracking()]);
    
    populateFilters();
    setupFilterListeners();
    loadCartFromStorage();
    
    // إعادة الرسم بالبيانات الجديدة لضمان التحديث
    renderApp();
    
    // التعامل مع الروابط المباشرة للكتب
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId');
    if (bookId) {
        router('gallery');
        setTimeout(() => openBookModal(bookId), 500);
    }
});

// --- دوال التحميل الجديدة (مع الكاش) ---

// دالة جديدة لقراءة البيانات المخزنة في المتصفح
function loadFromCache() {
    try {
        const cachedBooks = localStorage.getItem('db_books');
        const cachedSettings = localStorage.getItem('db_settings');
        const cachedSlider = localStorage.getItem('db_slider');
        
        if (cachedBooks) appState.books = JSON.parse(cachedBooks);
        if (cachedSettings) appState.settings = JSON.parse(cachedSettings);
        if (cachedSlider) appState.slider = JSON.parse(cachedSlider);
        
        // تحديث اللوجو والاسم فوراً من الكاش
        if(appState.settings) updateSiteBranding();
    } catch(e) { console.error('Cache Error', e); }
}

async function fetchBooks() {
    try {
        const res = await fetch(`${API_URL}?action=getBooks`);
        const data = await res.json();
        if (Array.isArray(data)) {
            appState.books = data;
            // حفظ نسخة في المتصفح للمرة القادمة
            localStorage.setItem('db_books', JSON.stringify(data)); 
            // إذا كان العميل يشاهد صفحة الكتب، نحدثها له فوراً
            if(appState.currentView === 'gallery') renderGallery(); 
        }
    } catch (e) { console.error('Error fetching books'); }
}

async function fetchSettings() {
    try {
        const res = await fetch(`${API_URL}?action=getSettings`);
        const data = await res.json();
        appState.settings = data;
        localStorage.setItem('db_settings', JSON.stringify(data)); // حفظ نسخة
        updateSiteBranding();
    } catch (e) { console.error(e); }
}

async function fetchSlider() {
    try {
        const res = await fetch(`${API_URL}?action=getSlider`);
        const data = await res.json();
        appState.slider = data;
        localStorage.setItem('db_slider', JSON.stringify(data)); // حفظ نسخة
        if(appState.currentView === 'home') renderStackSlider();
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

 // داخل دالة updateSiteBranding

if(s.site_logo) {
    const logoUrl = getImageUrl(s.site_logo); 

    // 1. تحديث أيقونة المتصفح (Favicon) - الكود الجديد
    const favicon = document.getElementById('favicon-icon');
    if (favicon) {
        favicon.href = logoUrl;
    }

    // 2. تحديث لوجو صفحة من نحن
    const aboutImg = document.getElementById('about-logo-img');
    const aboutIcon = document.getElementById('about-logo-icon');
    if(aboutImg && aboutIcon) { 
        aboutImg.src = logoUrl; 
        aboutImg.classList.remove('hidden'); 
        aboutIcon.classList.add('hidden'); 
    }

    // 3. تحديث لوجو الناف بار
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
    generateDynamicManifest();
}
// [index.js] تحديث دالة المانيفست لإصلاح خطأ start_url
function generateDynamicManifest() {
    const s = appState.settings;
    if (!s) return;

    // تجهيز اللوجو
    const iconUrl = s.site_logo ? getImageUrl(s.site_logo) : "https://placehold.co/512x512?text=App";

    // ✅ الحل هنا: استخدام الرابط الكامل للصفحة الحالية بدلاً من ./index.html
    // هذا يضمن أن المتصفح سيعرف المكان الصحيح لبدء التطبيق
    const currentUrl = window.location.origin + window.location.pathname;

    const manifestObject = {
        "name": s.site_name || "Book.com",
        "short_name": s.site_name || "Book.com",
        "start_url": currentUrl, // 👈 التغيير هنا (رابط مطلق)
        "display": "standalone",
        "background_color": "#050505",
        "theme_color": "#FFD700",
        "orientation": "portrait-primary",
        "scope": window.location.origin + "/", // تحديد نطاق التطبيق
        "icons": [
            {
                "src": iconUrl,
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": iconUrl,
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    };

    const stringManifest = JSON.stringify(manifestObject);
    const blob = new Blob([stringManifest], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(blob);
    
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
    }
    
    link.href = manifestURL;
}

// === Filter Logic ===
function populateFilters() {
    const books = appState.books;
    const categories = [...new Set(books.map(b => b.category).filter(Boolean))].sort();
    
    // التغيير: استخراج اللغات ودور النشر بدلاً من السنوات والأعمار
    const languages = [...new Set(books.map(b => b.language).filter(Boolean))].sort();
    const publishers = [...new Set(books.map(b => b.publisher).filter(Boolean))].sort();

    const catSelect = document.getElementById('filter-category');
    const langSelect = document.getElementById('filter-language'); // ID جديد
    const pubSelect = document.getElementById('filter-publisher'); // ID جديد

    // تفريغ القوائم أولاً لتجنب التكرار عند إعادة التحميل
    catSelect.innerHTML = '<option value="all">كل التصنيفات</option>';
    langSelect.innerHTML = '<option value="all">كل اللغات</option>';
    pubSelect.innerHTML = '<option value="all">جميع الدور</option>';

    categories.forEach(c => catSelect.add(new Option(c, c)));
    languages.forEach(l => langSelect.add(new Option(l, l)));
    publishers.forEach(p => pubSelect.add(new Option(p, p)));
}
function setupFilterListeners() {
    // تحديث الـ IDs
    const ids = ['search-input', 'filter-category', 'filter-language', 'filter-publisher'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', renderGallery);
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


container.innerHTML = activeSlides.map((slide, index) => {
    // التحقق من وجود كوبون
    const hasCoupon = slide.coupon_code && slide.coupon_code.trim() !== '';
    
    return `
        <div class="card-stack-item glass rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-white/10" id="slide-${index}" 
             style="z-index: ${activeSlides.length - index};">
            
            <img src="${getImageUrl(slide.image_url)}" class="w-full h-full object-cover mix-blend-overlay" onerror="this.src='https://placehold.co/800x400?text=Offer'">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            
            <div class="absolute bottom-0 left-0 w-full p-8 md:p-12 flex flex-col items-start">
                
                <div class="flex gap-2 mb-4">
                    <span class="bg-gold text-black px-4 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wider">مميز</span>
                    
                    ${hasCoupon ? `
                    <div class="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-1 pr-3 py-0.5 gap-2 cursor-pointer hover:bg-white/20 transition group" onclick="copyCoupon('${slide.coupon_code}')">
                        <span class="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">كوبون</span>
                        <span class="font-mono text-gold font-bold tracking-wider text-xs">${slide.coupon_code}</span>
                        <i class="far fa-copy text-gray-400 text-xs group-hover:text-white"></i>
                    </div>` : ''}
                </div>

                <h2 class="text-4xl md:text-6xl font-black mb-4 leading-tight text-white drop-shadow-2xl">${slide.title}</h2>
                <p class="text-xl text-gray-200 mb-8 max-w-xl drop-shadow-md leading-relaxed">${slide.subtitle || ''}</p>
                
                ${slide.link ? `<a href="${slide.link}" target="_blank" class="inline-block bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gold transition transform hover:-translate-y-1 shadow-xl">تصفح العرض</a>` : ''}
            </div>
        </div>
    `;
}).join('');

// [أضف هذه الدالة المساعدة في أي مكان في index.js]
function copyCoupon(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast(`تم نسخ الكوبون: ${code}`, 'success');
    });
}
    
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

// [index.js] دالة عرض المختارات (محدثة لنظام السلايدر الأفقي)
function renderFeatured() {
    const container = document.getElementById('featured-books');
    if (!container) return; 

    // 1. تصفية الكتب المميزة
    let featuredBooks = appState.books.filter(b => String(b.featured).toUpperCase().trim() === 'TRUE');

    if (featuredBooks.length === 0) {
        featuredBooks = [...appState.books].reverse().slice(0, 5);
    } else {
        featuredBooks = featuredBooks.reverse();
    }
    
    if (featuredBooks.length === 0) {
        container.innerHTML = '<div class="w-full text-center text-gray-500 my-10">لا توجد كتب مختارة حالياً</div>';
        return;
    }

    container.innerHTML = featuredBooks.map(book => {
        const p = calculatePrice(book.price, book.discount);
        const isOutOfStock = parseInt(book.stock) <= 0;

        // التغيير هنا في الكلاسات:
        // 1. snap-center: عشان الكرت يوقف في النص لما تسكرول
        // 2. shrink-0: عشان الكروت متصغرش وتفعص في بعضها
        // 3. w-[200px]: عرض ثابت للكرت
        return `
            <div class="min-w-[180px] w-[180px] md:min-w-[220px] md:w-[220px] shrink-0 snap-center glass rounded-2xl overflow-hidden cursor-pointer group relative transition duration-300 border border-white/5 hover:border-gold/30 hover:-translate-y-2" onclick="openBookModal('${book.id}')">
                
                <div class="w-full aspect-[2/3] overflow-hidden relative bg-[#151515] flex items-center justify-center">
                    <img src="${getImageUrl(book.image_url)}" class="w-full h-full object-contain p-2 group-hover:scale-105 transition duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''}" onerror="this.src='https://placehold.co/150x200?text=No+Image'">
                    
                    ${isOutOfStock 
                        ? `<span class="absolute top-2 left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-white/20 z-10">نفذت الكمية</span>`
                        : (p.hasDiscount ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-10">-${p.percent}%</span>` : '')
                    }

                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-20">
                         <i class="fas ${isOutOfStock ? 'fa-ban text-gray-400' : 'fa-eye text-white'} text-3xl drop-shadow-lg"></i>
                    </div>
                </div>
                
                <div class="p-4">
                    <h4 class="font-bold text-white truncate text-sm mb-1 group-hover:text-gold transition text-right">${book.title}</h4>
                    <div class="flex items-center gap-2 flex-row-reverse justify-end">
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
    // المتغيرات الجديدة
    const lang = document.getElementById('filter-language').value;
    const pub = document.getElementById('filter-publisher').value;
    
    const filtered = appState.books.filter(b => {
        const matchesSearch = (b.title + ' ' + b.author).toLowerCase().includes(term);
        const matchesCat = cat === 'all' || b.category === cat;
        // منطق الفلترة الجديد
        const matchesLang = lang === 'all' || b.language === lang;
        const matchesPub = pub === 'all' || b.publisher === pub;
        
        return matchesSearch && matchesCat && matchesLang && matchesPub;
    });
    
    // ... باقي الدالة كما هو (عرض الرسالة إذا لم توجد نتائج)
    if(!filtered.length) {
       // ... نفس الكود القديم لرسالة لا توجد نتائج ...
    }
    grid.innerHTML = filtered.map(book => createBookCard(book)).join('');
}   
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-language').value = 'all'; // جديد
    document.getElementById('filter-publisher').value = 'all'; // جديد
    renderGallery();
}

function createBookCard(book) {
    const p = calculatePrice(book.price, book.discount);
    // التحقق من المخزون
    const isOutOfStock = parseInt(book.stock) <= 0;

return `
    <div class="book-card group relative h-full flex flex-col cursor-pointer" onclick="openBookModal('${book.id}')">
        <div class="book-cover-wrapper w-full aspect-[2/3] rounded-xl overflow-hidden relative mb-4 shadow-lg border border-white/5 bg-[#151515] flex items-center justify-center">
             <img src="${getImageUrl(book.image_url)}" class="w-full h-full object-contain p-1 transition duration-500 ${isOutOfStock ? 'grayscale opacity-70' : ''}" onerror="this.src='https://placehold.co/300x450?text=No+Image'">
            
            ${isOutOfStock 
                ? `<span class="absolute top-3 right-3 bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded shadow-lg z-20 border border-white/20">نفذت الكمية</span>` 
                : (p.hasDiscount ? `<span class="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded shadow-lg z-10">خصم ${p.percent}%</span>` : '')
            }

            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px] z-30">
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
document.getElementById('modal-book-language').textContent = book.language || '-';
document.getElementById('modal-book-publisher').textContent = book.publisher || '-';
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

// [index.js] تحديث دالة تتبع الطلب (trackOrder)
function trackOrder(orderId) {
    const resultDiv = document.getElementById('tracking-result');
    const order = appState.orders.find(o => String(o.order_id).toUpperCase() === orderId);

    if(!order) {
        resultDiv.innerHTML = `<div class="text-center text-red-400 py-10 glass rounded-2xl border border-red-500/20"><i class="fas fa-search text-5xl mb-4 opacity-50"></i><p class="text-lg">عذراً، لم يتم العثور على طلب بهذا الرقم.</p></div>`;
        resultDiv.classList.remove('hidden');
        return;
    }

    // --- 1. الحسابات المالية (محدثة لتعرض الخصم بدقة) ---
    const total = parseFloat(order.total_price) || 0;
    const shipping = parseFloat(order.shipping_cost) || 0;
    const discount = parseFloat(order.discount_amount) || 0;
    
    // الأولوية للسعر المسجل في الشيت، لو مش موجود نحسبه (الإجمالي + الخصم - الشحن)
    const booksPrice = parseFloat(order.books_price) || (total + discount - shipping);

    // --- 2. التايم لاين (Timeline) ---
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
            <div class="bg-red-500/10 text-red-400 p-6 rounded-2xl text-center mb-8 border border-red-500/20">
                <i class="fas fa-ban text-4xl mb-3"></i>
                <h3 class="font-bold text-xl mb-1">تم إلغاء هذا الطلب</h3>
                <p class="text-sm opacity-70">تاريخ الإلغاء: ${order.date_cancelled || '-'}</p>
            </div>
        `;
    } else {
        // تحديد المرحلة الحالية لتلوين الخط
        let currentStepIndex = -1;
        steps.forEach((step, index) => {
            if (order.status.includes(step.status) || step.date) currentStepIndex = index;
        });

        timelineHtml = `<div class="relative flex flex-col md:flex-row justify-between items-start w-full my-8 px-2 md:px-4">
            <div class="absolute left-8 md:left-0 top-0 md:top-5 w-1 md:w-full h-full md:h-1 bg-gray-800 -z-10 md:mx-4"></div>
            
            <div class="hidden md:block absolute left-0 top-5 h-1 bg-green-600/50 -z-10 transition-all duration-1000" style="width: ${(currentStepIndex / (steps.length - 1)) * 100}%"></div>
        `;
        
        steps.forEach((step, index) => {
            const isDone = !!step.date || index <= currentStepIndex;
            const colorClass = isDone ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-[#1a1a1a] text-gray-600 border border-gray-700';
            
            timelineHtml += `
                <div class="flex md:flex-col items-center gap-6 md:gap-3 w-full md:w-auto mb-8 md:mb-0">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${colorClass} z-10 transition-all duration-500 relative">
                        <i class="fas ${step.icon}"></i>
                        ${isDone ? '<i class="fas fa-check-circle absolute -top-1 -right-1 text-white bg-green-600 rounded-full text-[10px] border border-black"></i>' : ''}
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

    // --- 3. المنتجات والأسعار ---
    let itemsHtml = '';
    if (order.items) {
        const itemsList = order.items.split(' | ');
        itemsHtml = itemsList.map(itemStr => {
            let title = itemStr;
            let qty = 1;
            let priceDisplay = '';

            const qtyMatch = itemStr.match(/(.*)\s\(x(\d+)\)$/);
            if(qtyMatch) {
                title = qtyMatch[1].trim();
                qty = parseInt(qtyMatch[2]);
            }

            const book = appState.books.find(b => b.title.trim() === title.trim());
            if(book) {
                // نعرض السعر الأصلي للكتاب هنا (بدون حساب خصم الكوبون عليه، لأن خصم الكوبون يظهر في الفاتورة النهائية)
                // لكن إذا كان الكتاب نفسه عليه خصم (Discount) نحسبه
                const price = parseFloat(book.price);
                const bookDiscount = parseFloat(book.discount) || 0; 
                const finalItemPrice = price - bookDiscount; 
                const totalItemPrice = finalItemPrice * qty;
                priceDisplay = `<span class="text-gold font-mono font-bold">${totalItemPrice} ج.م</span>`;
            } else {
                priceDisplay = `<span class="text-gray-600 text-xs">--</span>`;
            }

            return `
                <div class="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-white/5 hover:border-gold/20 transition group">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-gold group-hover:bg-gold/10 transition">
                            <i class="fas fa-book-open"></i>
                        </div>
                        <div>
                            <div class="text-gray-200 font-bold text-sm mb-1">${title}</div>
                            <div class="text-xs text-gray-500 flex items-center gap-2">
                                <span>الكمية: <span class="text-white">${qty}</span></span>
                            </div>
                        </div>
                    </div>
                    <div>${priceDisplay}</div>
                </div>
            `;
        }).join('');
    } else {
        itemsHtml = '<div class="text-gray-500 text-sm py-4 text-center">لا توجد تفاصيل للمنتجات</div>';
    }

    // --- 4. تجهيز سطر الخصم (HTML) ---
    let discountRowHtml = '';
    if (discount > 0) {
        discountRowHtml = `
        <div class="flex justify-between items-center text-sm bg-green-900/10 p-2 rounded border border-green-500/10 mt-2">
            <span class="text-green-400">خصم كوبون (${order.coupon_code || ''})</span>
            <span class="text-green-400 font-medium font-mono">-${discount} ج.م</span>
        </div>`;
    }

    // --- 5. الهيكل النهائي ---
    resultDiv.innerHTML = `
        <div class="animate-fade-in">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-white/10 pb-6 gap-4">
                <div>
                    <h3 class="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                        <span class="text-gold text-3xl"><i class="fas fa-box"></i></span>
                        <div>
                            <span class="block text-xs text-gray-500 font-normal mb-1">رقم الطلب</span>
                            <span class="font-mono text-white tracking-wider">#${order.order_id}</span>
                        </div>
                    </h3>
                </div>
                <div class="bg-gold/10 text-gold border border-gold/20 px-5 py-2 rounded-full text-sm font-bold shadow-glow flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-gold animate-pulse"></div>
                    ${order.status}
                </div>
            </div>

            ${timelineHtml}

            <div class="grid grid-cols-1 gap-6 mt-6">
                
                <div class="">
                    <h4 class="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <i class="fas fa-list text-gray-500"></i> قائمة المنتجات
                    </h4>
                    <div class="space-y-3">
                        ${itemsHtml}
                    </div>
                </div>

                <div class="">
                    <div class="bg-white/5 rounded-2xl p-6 border border-white/10 sticky top-24 shadow-xl">
                        <h4 class="text-white font-bold mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
                            <i class="fas fa-file-invoice-dollar text-gold"></i> ملخص الدفع
                        </h4>
                        
                        <div class="space-y-4">
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-gray-400">مجموع الكتب</span>
                                <span class="text-white font-medium font-mono">${booksPrice} ج.م</span>
                            </div>
                            
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-orange-400">مصاريف الشحن ${order.governorate ? `<span class="text-[10px] text-gray-500">(${order.governorate})</span>` : ''}</span>
                                <span class="text-gold font-medium font-mono">${shipping > 0 ? shipping + ' ج.م' : 'مجاني'}</span>
                            </div>

                            ${discountRowHtml}
                            
                            <div class="border-t-2 border-dashed border-white/10 my-2"></div>
                            
                            <div class="flex justify-between items-end">
                                <span class="text-gray-200 font-bold text-lg">الإجمالي الكلي</span>
                                <span class="text-2xl text-green-400 font-bold font-mono">${total} <small class="text-xs text-gray-500 font-normal">ج.م</small></span>
                            </div>
                            
                            <div class="bg-blue-900/20 rounded-lg p-3 mt-4 text-center border border-blue-500/20">
                                <p class="text-xs text-blue-300">
                                    <i class="fas fa-headset mb-1 block text-lg opacity-50"></i> 
                                    سيتم التواصل معك لتحديد طريقة الدفع
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
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
    
    // حساب الإجمالي للسلة الجانبية
    const total = appState.cart.reduce((sum, item) => {
        const p = calculatePrice(item.price, item.discount);
        return sum + (p.final * item.qty);
    }, 0);

    // تحديث عداد السلة
    const countEl = document.getElementById('cart-count');
    if(countEl) {
        if(appState.cart.length) {
            countEl.textContent = appState.cart.reduce((s,i)=>s+i.qty,0);
            countEl.classList.remove('hidden');
            setTimeout(()=> countEl.classList.remove('scale-0'), 100);
        } else {
            countEl.classList.add('scale-0');
            setTimeout(()=> countEl.classList.add('hidden'), 300);
        }
    }

    // عرض العناصر في السلة الجانبية
    if(!appState.cart.length) {
        if(container) container.innerHTML = '<div class="text-center py-20 text-gray-500 flex flex-col items-center"><i class="fas fa-shopping-basket text-5xl mb-4 opacity-20"></i><p>السلة فارغة حالياً</p><button onclick="closeCart(); router(\'gallery\')" class="mt-4 text-gold hover:underline">تصفح الكتب</button></div>';
        if(totalEl) totalEl.textContent = '0 ج.م';
        return;
    }

    if(container) {
        container.innerHTML = appState.cart.map(item => {
            const p = calculatePrice(item.price, item.discount);

return `
    <div class="flex gap-4 bg-white/5 p-3 rounded-xl border border-white/5 relative group hover:bg-white/10 transition items-center">
       <div class="w-16 h-24 shrink-0 bg-[#151515] rounded-lg overflow-hidden border border-white/10">
            <img src="${getImageUrl(item.image_url)}" class="w-full h-full object-contain">
       </div>
        <div class="flex-1 flex flex-col justify-between h-24 py-1">
            <div>
                <h4 class="font-bold text-sm text-white line-clamp-2 mb-1 leading-snug">${item.title}</h4>
                <div class="text-gold text-sm font-bold">${p.final} ج.م</div>
            </div>
            <div class="flex items-center gap-3 bg-black/40 w-max px-2 py-1 rounded-lg border border-white/5 mt-auto">
                <button onclick="updateQty('${item.id}', -1)" class="text-gray-400 hover:text-white px-1">-</button>
                <span class="text-sm w-4 text-center font-bold">${item.qty}</span>
                <button onclick="updateQty('${item.id}', 1)" class="text-gray-400 hover:text-white px-1">+</button>
            </div>
        </div>
        <button onclick="updateQty('${item.id}', -100)" class="absolute top-3 right-3 text-red-500/50 hover:text-red-500 transition"><i class="fas fa-trash-alt"></i></button>
    </div>
`;
        }).join('');
    }
    
    if(totalEl) totalEl.textContent = total.toFixed(0) + ' ج.م';
    
    // تحديث قسم الـ Checkout إذا كان موجوداً
    // (الإصلاح الجوهري هنا: نستخدم updateCheckoutTotals بدلاً من التعديل اليدوي)
    const checkoutView = document.getElementById('checkout-view');
    if(checkoutView && !checkoutView.classList.contains('hidden')) {
        const checkSum = document.getElementById('checkout-summary');
        if(checkSum) {
             checkSum.innerHTML = appState.cart.map(i => {
                const p = calculatePrice(i.price, i.discount);
                return `<div class="flex justify-between mb-2 text-sm border-b border-white/5 pb-2 last:border-0">
                    <span class="text-gray-300">${i.title} <span class="text-gray-500 text-xs">x${i.qty}</span></span>
                    <span class="font-bold text-white">${p.final * i.qty}</span>
                </div>`;
            }).join('');
        }
        // استدعاء دالة الحسابات الجديدة لضمان تحديث الأرقام الصحيحة
        if(typeof updateCheckoutTotals === 'function') {
            updateCheckoutTotals();
        }
    }
}

document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!appState.cart.length) return showToast('السلة فارغة', 'error');

    // ✅ جلب القيم المحدثة من دالة الحسابات
    const totals = updateCheckoutTotals(); 
    
    const govSelect = document.getElementById('governorate-select');
    if (!govSelect.value) {
        return showToast('يرجى اختيار المحافظة لحساب الشحن', 'error');
    }

    const btn = document.getElementById('confirm-order-btn');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الطلب...';
    btn.disabled = true;

    try {
        const fd = new FormData(e.target);
        
        const orderData = {
            customer_name: fd.get('name'),
            phone: fd.get('phone'),
            email: fd.get('email'),
            address: fd.get('address'),
            notes: fd.get('notes'),
            governorate: fd.get('governorate'),
            
            // ✅ إرسال البيانات المالية الجديدة
            books_price: totals.subtotal,
            shipping_cost: totals.shipping,
            discount_amount: totals.discount, // الخصم
            coupon_code: totals.coupon,       // كود الكوبون
            total_price: totals.total,        // الإجمالي النهائي
            
            items: appState.cart.map(i => `${i.title} (x${i.qty})`).join(' | '),
            cartData: JSON.stringify(appState.cart),
            status: 'جديد',
            action: 'placeOrder'
        };

        const res = await fetch(`${API_URL}?action=placeOrder`, { 
            method: 'POST', body: JSON.stringify(orderData) 
        });
        
        const result = await res.json();
        
        if(result.success) {
             const newLocalOrder = {
                order_id: result.orderId,
                status: 'جديد',
                total_price: orderData.total_price + ' ج.م',
                items: orderData.items,
                date: new Date().toLocaleString('en-GB'),
                // حفظنا الخصم محلياً للعرض السريع في التاريخ إذا أردت
                discount_amount: orderData.discount_amount 
            };
            appState.orders.push(newLocalOrder);
            saveOrderLocal(result.orderId);
            
            document.getElementById('success-order-id').textContent = result.orderId;
            document.getElementById('success-modal').classList.remove('hidden');
            appState.cart = [];
            appState.activeCoupon = null; // ✅ تصفير الكوبون بعد النجاح
            saveCart(); renderCart();
            e.target.reset();
            govSelect.value = "";
            updateCheckoutTotals(); // تصفير الأرقام
        } else {
            throw new Error(result.error);
        }
    } catch(err) {
        console.error(err);
        showToast('خطأ: ' + (err.message || 'حدث خطأ في الاتصال'), 'error');
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
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


function router(view) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('slide-in'); 
    });
    
    // إيقاف السلايدر إذا خرجنا من الصفحة الرئيسية
    if (view !== 'home') stopAutoSlide();

    const target = document.getElementById(view + '-view');
    if(target) {
        target.classList.remove('hidden');
        void target.offsetWidth; 
        target.classList.add('slide-in');
    }
    
    appState.currentView = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update nav state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('text-gold', 'bg-white/10'));

    // --- التعديلات تبدأ هنا ---
    if(view === 'gallery') {
        renderGallery();
    } else if (view === 'home') {
        renderStackSlider();
        renderFeatured();
    } else if (view === 'tracking') { 
        renderOrderHistory();
    } else if (view === 'checkout') {
        // هذا هو الجزء الذي يحل مشكلتك
        renderCart(); // لرسم منتجات الملخص
        setupCheckoutLogic(); // للتأكد من تجهيز القائمة
        setTimeout(() => updateCheckoutTotals(), 50); // لحساب السعر فوراً
    }
    // --- انتهى التعديل ---
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
function toggleFilters() {
    const container = document.getElementById('filters-container');
    container.classList.toggle('hidden');
    container.classList.toggle('grid'); // للتبديل بين الإخفاء ونظام الشبكة
}
// === Local Order History Logic ===

// 1. دالة لحفظ الطلب في اللوكال ستوريج
function saveOrderLocal(orderId) {
    let history = JSON.parse(localStorage.getItem('myOrderHistory') || '[]');
    const date = new Date().toLocaleDateString('en-GB'); // التاريخ بتنسيق يوم/شهر/سنة
    
    // التحقق من عدم تكرار الطلب
    if (!history.find(o => o.id === orderId)) {
        // إضافة الطلب الجديد في بداية المصفوفة
        history.unshift({ id: orderId, date: date });
        // حفظ المصفوفة
        localStorage.setItem('myOrderHistory', JSON.stringify(history));
    }
    // تحديث العرض إذا كنا في صفحة التتبع
    renderOrderHistory();
}

// استبدل دالة renderOrderHistory بهذا الكود الجديد
function renderOrderHistory() {
    // تحديد العناصر الجديدة
    const sidebar = document.getElementById('history-sidebar-container');
    const container = document.getElementById('history-list'); // الحاوية داخل السايد بار
    
    // جلب البيانات
    const history = JSON.parse(localStorage.getItem('myOrderHistory') || '[]');

    // إذا لم يكن هناك سجل، نخفي السايد بار
    if (history.length === 0) {
        if(sidebar) sidebar.classList.add('hidden');
        return;
    }

    // إظهار السايد بار
    if(sidebar) sidebar.classList.remove('hidden');

    // تعبئة البيانات بتصميم مضغوط (Compact) يناسب القائمة الجانبية
    if(container) {
        container.innerHTML = history.map(item => `
            <div class="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition cursor-pointer group relative overflow-hidden" onclick="trackFromHistory('${item.id}')">
                
                <div class="flex items-center justify-between relative z-10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold text-xs shrink-0">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="overflow-hidden">
                            <div class="font-bold text-white text-xs font-mono truncate">${item.id}</div>
                            <div class="text-[14px] text-orange-500">${item.date}</div>
                        </div>
                    </div>
                    
                    <button onclick="event.stopPropagation(); deleteOrderFromHistory('${item.id}')" class="text-gray-600 hover:text-red-500 transition px-2" title="حذف">
                        <i class="fas fa-times text-sm"></i>
                    </button>
                </div>
                
                <div class="absolute inset-0 bg-gold/5 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
            </div>
        `).join('');
    }
}

// 3. دالة الحذف من السجل
function deleteOrderFromHistory(id) {
    if(!confirm('هل تريد حذف هذا الطلب من سجلك المحلي؟')) return;
    
    let history = JSON.parse(localStorage.getItem('myOrderHistory') || '[]');
    history = history.filter(item => item.id !== id);
    localStorage.setItem('myOrderHistory', JSON.stringify(history));
    
    renderOrderHistory();
    showToast('تم الحذف من السجل', 'info');
}

// 4. دالة التتبع المباشر عند الضغط
function trackFromHistory(id) {
    const input = document.querySelector('#tracking-form input[name="orderId"]');
    if(input) {
        input.value = id;
        trackOrder(id);
        // سكرول ناعم لنتيجة البحث
        setTimeout(() => {
            document.getElementById('tracking-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// 

// 1. قائمة أسعار الشحن (تعديل حسب رغبتك)


// 2. دالة لتهيئة قائمة المحافظات وحساب السعر
function setupCheckoutLogic() {
    const govSelect = document.getElementById('governorate-select');
    if(!govSelect) return;

    // ملء القائمة
    govSelect.innerHTML = '<option value="" disabled selected>اختر المحافظة لتحديد الشحن...</option>';
    Object.keys(SHIPPING_RATES).sort().forEach(gov => {
        govSelect.add(new Option(gov, gov));
    });

    // الاستماع للتغيير
    govSelect.addEventListener('change', updateCheckoutTotals);
}

// [index.js] دالة الحسابات المركزية (المحدثة)
function updateCheckoutTotals() {
    // 1. حساب مجموع الكتب
    const cartTotal = appState.cart.reduce((sum, item) => {
        const p = calculatePrice(item.price, item.discount);
        return sum + (p.final * item.qty);
    }, 0);

    // 2. حساب الشحن
    const govSelect = document.getElementById('governorate-select');
    const selectedGov = govSelect ? govSelect.value : '';
    let shippingCost = selectedGov ? (SHIPPING_RATES[selectedGov] || 0) : 0;

    // 3. حساب الخصم (الجديد)
    let discountAmount = 0;
    
    if (appState.activeCoupon) {
        const coupon = appState.activeCoupon;
        
        // التأكد من الحد الأدنى مجدداً (في حال حذف منتج من السلة)
        if (cartTotal < (Number(coupon.min_order) || 0)) {
             discountAmount = 0;
             const msg = document.getElementById('coupon-msg');
             if(msg) {
                 msg.textContent = `عفواً، الطلب أقل من الحد الأدنى للكوبون (${coupon.min_order} ج.م)`;
                 msg.className = 'text-[10px] mt-2 h-4 text-orange-400';
             }
        } else {
            if (coupon.type === 'percent') {
                discountAmount = cartTotal * (coupon.value / 100);
                // تطبيق الحد الأقصى للخصم (Max Discount)
                if (coupon.max_discount && discountAmount > coupon.max_discount) {
                    discountAmount = coupon.max_discount;
                }
            } else if (coupon.type === 'fixed') {
                discountAmount = coupon.value;
            } else if (coupon.type === 'free_shipping') {
                if (selectedGov) {
                    discountAmount = shippingCost;
                }
            }
        }
    }
    
    // 4. الحساب النهائي
    let finalTotal = (cartTotal + shippingCost) - discountAmount;
    if (finalTotal < 0) finalTotal = 0;

    // 5. تحديث الشاشة
    const subTotalEl = document.getElementById('summary-subtotal');
    if(subTotalEl) subTotalEl.textContent = cartTotal + ' ج.م';

    const shippingEl = document.getElementById('summary-shipping');
    if(shippingEl) {
        if (selectedGov) {
            // عرض خاص للشحن المجاني
            if (appState.activeCoupon && appState.activeCoupon.type === 'free_shipping' && discountAmount > 0) {
                 shippingEl.innerHTML = `<span class="line-through text-gray-500 text-xs">${shippingCost}</span> <span class="text-green-400 font-bold">مجاني</span>`;
            } else {
                 shippingEl.textContent = shippingCost + ' ج.م';
            }
            shippingEl.classList.remove('text-gray-500');
            shippingEl.classList.add('text-gold');
        } else {
            shippingEl.textContent = '--';
            shippingEl.classList.remove('text-gold');
            shippingEl.classList.add('text-gray-500');
        }
    }

    // إظهار/إخفاء سطر الخصم
    const discountRow = document.getElementById('summary-discount-row');
    const discountVal = document.getElementById('summary-discount');
    const discountCodeDisplay = document.getElementById('discount-code-display');
    
    if (discountAmount > 0) {
        if(discountRow) {
            discountRow.classList.remove('hidden');
            discountRow.classList.add('flex');
            discountVal.textContent = `-${discountAmount.toFixed(0)} ج.م`;
            discountCodeDisplay.textContent = appState.activeCoupon.code;
        }
    } else {
        if(discountRow) {
            discountRow.classList.add('hidden');
            discountRow.classList.remove('flex');
        }
    }

    const totalEl = document.getElementById('summary-total');
    if(totalEl) totalEl.textContent = finalTotal.toFixed(0) + ' ج.م';

    // إرجاع القيم لاستخدامها عند الإرسال
    return { 
        subtotal: cartTotal, 
        shipping: shippingCost, 
        discount: discountAmount,
        coupon: appState.activeCoupon && discountAmount > 0 ? appState.activeCoupon.code : '',
        total: finalTotal 
    };
}

document.addEventListener('DOMContentLoaded', () => {

    setupCheckoutLogic(); 
});


// [index.js] دالة تطبيق الكوبون
async function applyCoupon() {
    const input = document.getElementById('coupon-input');
    const btn = document.getElementById('btn-apply-coupon');
    const msg = document.getElementById('coupon-msg');
    const code = input.value.trim().toUpperCase();

    if (!code) return;

    // حساب قيمة الكتب الحالية لإرسالها للسيرفر (للتحقق من الحد الأدنى)
    const currentBooksTotal = appState.cart.reduce((sum, item) => {
         const p = calculatePrice(item.price, item.discount);
         return sum + (p.final * item.qty);
    }, 0);

    // تغيير شكل الزر أثناء التحميل
    const oldBtnContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    msg.textContent = '';
    msg.className = 'text-[10px] mt-2 h-4 font-bold transition-all duration-300';

    try {
        const res = await fetch(`${API_URL}?action=validateCoupon`, {
            method: 'POST',
            body: JSON.stringify({ code: code, total: currentBooksTotal })
        });
        const result = await res.json();

        if (result.success) {
            appState.activeCoupon = result; // حفظ الكوبون في الذاكرة
            msg.textContent = `تم تطبيق خصم ${result.type === 'percent' ? result.value + '%' : result.value + ' ج.م'} بنجاح! 🎉`;
            msg.className = 'text-[10px] mt-2 h-4 text-green-400 font-bold';
            
            // قفل الحقل
            input.disabled = true;
            input.classList.add('opacity-50', 'cursor-not-allowed');
            btn.innerHTML = '<i class="fas fa-check"></i>';
            
            updateCheckoutTotals(); // تحديث الحسابات فوراً
        } else {
            appState.activeCoupon = null;
            msg.textContent = result.message || 'الكوبون غير صالح';
            msg.className = 'text-[10px] mt-2 h-4 text-red-500 font-bold';
            btn.innerHTML = oldBtnContent;
            btn.disabled = false;
            updateCheckoutTotals();
        }
    } catch (e) {
        console.error(e);
        msg.textContent = 'حدث خطأ في الاتصال';
        msg.className = 'text-[10px] mt-2 h-4 text-red-500';
        btn.innerHTML = oldBtnContent;
        btn.disabled = false;
    }
}
function copyCoupon(code) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
        showToast(`تم نسخ الكوبون: ${code}`, 'success');
    }).catch(() => {
        showToast('فشل النسخ', 'error');
    });
}