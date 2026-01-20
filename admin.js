// 🔴 تأكد من استبدال هذا الرابط بالرابط الجديد الذي ستحصل عليه من الخطوة السابقة
const API_URL = 'https://script.google.com/macros/s/AKfycbzfOXr12LT0cDOyvHntR3cPBTVFXVaOMnamUBsU0bdOHtGFJFue6LsPDav1r0_tGO8/exec';


// === Global Variables ===
let allBooksData = [];
let allOrdersData = [];
let allSliderData = []; 
let confirmCallback = null; // تعريف متغير التأكيد في البداية لتجنب الأخطاء

// === Sidebar Logic (للتحكم في القائمة الجانبية للموبايل) ===
function toggleSidebar(forceState = null) {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if(!sidebar || !overlay) return;

    // في الموبايل هو مخفي (translate-x-full) افتراضياً
    const isHidden = sidebar.classList.contains('translate-x-full');
    const shouldShow = forceState !== null ? forceState : isHidden;

    if (shouldShow) {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    }
}

// === Auth & Navigation ===
async function adminLogin() {
    const userInput = document.getElementById('admin-user'); 
    const passInput = document.getElementById('admin-pass');
    const btn = document.querySelector('#login-modal button');
    
    // إنشاء حقل اسم المستخدم إذا لم يكن موجوداً
    if (!userInput) {
        const passContainer = passInput.parentElement;
        const userField = document.createElement('input');
        userField.type = 'text';
        userField.id = 'admin-user';
        userField.placeholder = 'اسم المستخدم (admin)';
        userField.className = 'input-field mb-4 text-center text-lg';
        passContainer.insertBefore(userField, passInput);
        return; 
    }

    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}?action=getSettings`);
        const settings = await res.json();
        
        const validUser = settings.user || 'admin';
        const validPass = settings.password || '123456';

        if (userInput.value === validUser && passInput.value === validPass) {
            document.getElementById('login-modal').classList.add('hidden');
            document.getElementById('admin-panel').classList.remove('hidden');
            
            // إظهار هيدر الموبايل عند الدخول
            const mobileHeader = document.getElementById('mobile-header');
            if(mobileHeader) mobileHeader.classList.remove('hidden');

            showToast('تم تسجيل الدخول بنجاح', 'success');
            loadSettings(settings);
        } else {
            showToast('بيانات الدخول غير صحيحة!', 'error');
            passInput.value = '';
        }
    } catch (e) {
        showToast('خطأ في الاتصال بالسيرفر', 'error');
        console.error(e);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // التأكد من وجود حقل اسم المستخدم عند التحميل
    const passInput = document.getElementById('admin-pass');
    if(passInput && !document.getElementById('admin-user')) {
        const userField = document.createElement('input');
        userField.type = 'text';
        userField.id = 'admin-user';
        userField.placeholder = 'اسم المستخدم';
        userField.className = 'input-field mb-4 text-center text-lg';
        passInput.parentElement.insertBefore(userField, passInput);
    }
    
    // مستمعي البحث
    const invSearch = document.getElementById('inventory-search');
    if(invSearch) invSearch.addEventListener('input', (e) => filterInventory(e.target.value));

    const ordSearch = document.getElementById('orders-search');
    if(ordSearch) ordSearch.addEventListener('input', (e) => filterOrders(e.target.value));

    // تفعيل زر "نعم" في مودال التأكيد
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    if(confirmYesBtn) {
        confirmYesBtn.addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            closeConfirmModal();
        });
    }
});

function switchTab(tabId) {
    document.querySelectorAll('.admin-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('tab-' + tabId);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('bg-white/5', 'text-white');
        btn.classList.add('text-gray-400');
    });
    
    const activeBtn = Array.from(document.querySelectorAll('.admin-tab-btn')).find(b => b.onclick && b.onclick.toString().includes(tabId));
    if(activeBtn) {
        activeBtn.classList.add('bg-white/5', 'text-white');
        activeBtn.classList.remove('text-gray-400');
    }

    if(tabId === 'inventory') loadInventory();
    if(tabId === 'orders') loadOrders();
    
    // ✅ هذا هو التعديل المهم: استدعاء دالة الكوبونات عند فتح السلايدر
    if(tabId === 'slider') {
        loadSlider();
        populateSliderCoupons(); 
    }
    
    if(tabId === 'coupons') loadCoupons();
}
// === Toast & Confirm Modal Utilities ===
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = {
        success: 'border-green-500 bg-green-900/90',
        error: 'border-red-500 bg-red-900/90',
        info: 'border-blue-500 bg-blue-900/90'
    };
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.className = `min-w-[300px] p-4 rounded-lg shadow-2xl border-r-4 ${colors[type]} text-white flex items-center gap-3 slide-in backdrop-blur-sm`;
    toast.innerHTML = `<i class="fas ${icons[type]} text-xl"></i> <span class="font-bold">${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showConfirm(message, callback) {
    const modal = document.getElementById('confirm-modal');
    const box = document.getElementById('confirm-box');
    const msgEl = document.getElementById('confirm-message');
    
    if(msgEl) msgEl.textContent = message;
    
    confirmCallback = callback;
    
    if(modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            if(box) {
                box.classList.remove('opacity-0', 'scale-95');
                box.classList.add('opacity-100', 'scale-100');
            }
        }, 10);
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    const box = document.getElementById('confirm-box');
    
    if(box) {
        box.classList.remove('opacity-100', 'scale-100');
        box.classList.add('opacity-0', 'scale-95');
    }
    
    setTimeout(() => {
        if(modal) modal.classList.add('hidden');
        confirmCallback = null;
    }, 300);
}

// === ADD BOOK ===
document.getElementById('add-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    btn.disabled = true;

    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const response = await fetch(`${API_URL}?action=addBook`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if(result.success) {
            showToast(result.message, 'success');
            e.target.reset();
        } else throw new Error(result.error);
    } catch(err) {
        showToast('فشل الاتصال بالسيرفر: ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// === INVENTORY ===
async function loadInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>';
    try {
        const response = await fetch(`${API_URL}?action=getBooks`);
        const books = await response.json();
        allBooksData = books.reverse();
        renderInventory(allBooksData);
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-400">فشل تحميل البيانات: ${err}</td></tr>`;
    }
}
// [admin.js] دالة لتبديل حالة تمييز الكتاب
async function toggleBookFeatured(id, newState) {
    // تحديث واجهة المستخدم فورياً (Optimistic Update) لجعلها سريعة
    const bookIndex = allBooksData.findIndex(b => b.id == id);
    if(bookIndex > -1) {
        allBooksData[bookIndex].featured = newState ? 'TRUE' : 'FALSE';
        renderInventory(allBooksData); // إعادة الرسم فوراً
    }

    try {
        await fetch(`${API_URL}?action=updateBook`, {
            method: 'POST',
            body: JSON.stringify({
                id: id,
                featured: newState ? 'TRUE' : 'FALSE'
            })
        });
        showToast(newState ? 'تمت إضافة الكتاب للمختارات 🌟' : 'تمت إزالة الكتاب من المختارات', 'success');
    } catch(e) {
        showToast('فشل تحديث الحالة', 'error');
        // تراجع في حالة الخطأ
        if(bookIndex > -1) {
            allBooksData[bookIndex].featured = !newState ? 'TRUE' : 'FALSE';
            renderInventory(allBooksData);
        }
    }
}
// [admin.js]
function renderInventory(books) {
    const tbody = document.getElementById('inventory-table-body');
    if(!tbody) return;
    if(!books.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">لا توجد نتائج</td></tr>';
        return;
    }
    tbody.innerHTML = books.map(book => {
        // تنظيف القيمة: إذا كانت TRUE نحولها لـ 1 (مؤقتاً) أو نتركها كما هي إذا كانت رقماً
        let orderVal = book.featured;
        if(orderVal === 'TRUE') orderVal = ''; // لتجبرك على وضع رقم جديد
        if(orderVal === 'FALSE') orderVal = '';
        
        return `
        <tr class="hover:bg-white/5 transition group border-b border-white/5 last:border-0">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <img src="${getImageUrl(book.image_url)}" class="w-10 h-14 object-cover rounded shadow-sm bg-gray-800" onerror="this.src='https://via.placeholder.com/40x60'">
                    <div>
                        <div class="font-bold text-white">${book.title}</div>
                        <div class="text-xs text-gray-400">${book.author}</div>
                    </div>
                </div>
            </td>
            <td class="p-4"><div class="text-gold font-bold">${book.price} ج.م</div></td>
            <td class="p-4"><span class="font-bold ${book.stock > 5 ? 'text-green-400' : 'text-red-400'}">${book.stock}</span></td>
            <td class="p-4">
                <div class="text-xs text-gray-300 mb-1">${book.category || 'عام'}</div>
            </td>
            
            <td class="p-4 text-center">
                <input type="number" 
                       value="${orderVal}" 
                       placeholder="-"
                       class="bg-[#111] border ${orderVal ? 'border-gold text-gold' : 'border-white/10 text-gray-500'} rounded-lg w-16 text-center p-2 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition font-bold"
                       onchange="updateBookOrder('${book.id}', this.value)">
            </td>

            <td class="p-4 text-center">
                <div class="flex justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                    <button onclick='openEditModal(${JSON.stringify(book).replace(/'/g, "'")})' class="bg-blue-600 p-2 rounded text-white hover:bg-blue-500"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteBook('${book.id}')" class="bg-red-600 p-2 rounded text-white hover:bg-red-500"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');
}
// [admin.js] دالة لحفظ ترتيب الكتاب فوراً عند تغيير الرقم
async function updateBookOrder(id, orderValue) {
    // 1. تحديث محلي سريع
    const bookIndex = allBooksData.findIndex(b => b.id == id);
    if(bookIndex > -1) {
        allBooksData[bookIndex].featured = orderValue;
        // نغير لون الحدود فوراً ليعرف المستخدم أنه تم التغيير
        const input = document.activeElement;
        if(input) {
            input.classList.add('border-green-500', 'text-green-500');
            if(!orderValue) input.classList.remove('border-gold', 'text-gold');
        }
    }

    try {
        // 2. إرسال للسيرفر
        await fetch(`${API_URL}?action=updateBook`, {
            method: 'POST',
            body: JSON.stringify({
                id: id,
                featured: orderValue ? String(orderValue) : 'FALSE' // إذا مسح الرقم نرسل FALSE
            })
        });
        showToast('تم حفظ الترتيب ✅', 'success');
    } catch(e) {
        showToast('فشل الحفظ', 'error');
    }
}

function filterInventory(term) {
    const lowerTerm = term.toLowerCase();
    const filtered = allBooksData.filter(book => (book.title && book.title.toLowerCase().includes(lowerTerm)) || (book.author && book.author.toLowerCase().includes(lowerTerm)));
    renderInventory(filtered);
}

function openEditModal(book) {
    const form = document.getElementById('edit-book-form');
    if(!form) return;
    form.id.value = book.id || '';
    form.title.value = book.title || '';
    form.author.value = book.author || '';
    form.price.value = book.price || '';
    form.stock.value = book.stock || '';
    form.discount.value = book.discount || 0;
    form.category.value = book.category || 'روايات';
    
    form.publisher.value = book.publisher || ''; 
    form.language.value = book.language || 'العربية'; 

    form.image_url.value = book.image_url || '';
    form.tags.value = book.tags || '';
    form.description.value = book.description || '';
    document.getElementById('edit-modal').classList.remove('hidden');
}

document.getElementById('edit-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.innerHTML;
    btn.innerHTML = 'جاري التحديث...';
    btn.disabled = true;
    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const response = await fetch(`${API_URL}?action=updateBook`, { method: 'POST', body: JSON.stringify(data) });
        const result = await response.json();
        if(result.success) {
            showToast('تم تحديث الكتاب بنجاح', 'success');
            document.getElementById('edit-modal').classList.add('hidden');
            loadInventory();
        } else throw new Error(result.error);
    } catch(err) {
        showToast('فشل التحديث: ' + err.message, 'error');
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
});

function deleteBook(id) {
    showConfirm('هل أنت متأكد تماماً من حذف هذا الكتاب؟', async () => {
        showToast('جاري الحذف...', 'info');
        try {
            const response = await fetch(`${API_URL}?action=deleteBook`, { method: 'POST', body: JSON.stringify({ id: id }) });
            const result = await response.json();
            if(result.success) { showToast('تم الحذف بنجاح', 'success'); loadInventory(); }
            else showToast('فشل الحذف', 'error');
        } catch(e) { showToast('خطأ في الاتصال', 'error'); }
    });
}

async function loadSlider() {
    const container = document.getElementById('slider-list-container');
    if(!container) return;
    container.innerHTML = '<div class="loader mx-auto"></div>';
    
    try {
        const res = await fetch(`${API_URL}?action=getSlider`);
        const sliders = await res.json();
        allSliderData = sliders;

        if(!sliders.length) {
            container.innerHTML = '<div class="text-center text-gray-500 p-8 border border-dashed border-gray-700 rounded-lg">لا توجد عروض حالياً</div>';
            return;
        }

        container.innerHTML = sliders.map(slide => {
            const isActive = slide.active === 'TRUE' || slide.active === true;
            
            // تجهيز البيانات لتمريرها للدالة بأمان (التعامل مع علامات التنصيص)
            const slideData = JSON.stringify(slide).replace(/"/g, '&quot;');
            
            return `
            <div class="glass p-4 rounded-xl border ${isActive ? 'border-green-500/30' : 'border-red-500/30'} flex flex-col md:flex-row gap-4 items-center">
                <img src="${getImageUrl(slide.image_url)}" class="w-32 h-20 object-cover rounded-lg border border-white/10" onerror="this.src='https://via.placeholder.com/150x80'">
                
                <div class="flex-1 text-center md:text-right">
                    <div class="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <h4 class="font-bold text-lg text-white">${slide.title || 'بدون عنوان'}</h4>
                        ${slide.coupon_code ? `
                            <span class="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1">
                                <i class="fas fa-tag"></i> ${slide.coupon_code}
                            </span>
                        ` : ''}
                    </div>
                    
                    <p class="text-sm text-gray-400">${slide.subtitle || ''}</p>
                    
                    ${slide.link ? `<a href="${slide.link}" target="_blank" class="text-xs text-blue-400 hover:underline truncate block max-w-[200px] mt-1" dir="ltr">${slide.link}</a>` : ''}
                </div>

                <div class="flex items-center gap-3">
                    <button onclick="toggleSlider('${slide.id}', ${!isActive})" class="${isActive ? 'bg-green-600' : 'bg-red-600'} text-white text-xs px-3 py-1 rounded-full font-bold h-8 transition hover:opacity-80">
                        ${isActive ? 'مفعل' : 'معطل'}
                    </button>
                    
                    <button onclick="openEditSliderModal(${slideData})" class="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg transition" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    <button onclick="deleteSlider('${slide.id}')" class="bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg transition" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `}).join('');
        
    } catch(err) {
        console.error(err);
        container.innerHTML = '<div class="text-center text-red-500">فشل تحميل السلايدر</div>';
    }
}

document.getElementById('add-slider-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = 'جاري الإضافة...';
    btn.disabled = true;

    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.active = 'TRUE'; 

        const res = await fetch(`${API_URL}?action=addSlider`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if(result.success) {
            showToast('تمت إضافة العرض بنجاح', 'success');
            e.target.reset();
            loadSlider();
        } else throw new Error(result.error);
    } catch(err) {
        showToast('فشل الإضافة: ' + err.message, 'error');
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
});


function openEditSliderModal(slide) {
    const form = document.getElementById('edit-slider-form');
    if(!form) return;
    
    // تعبئة البيانات مباشرة
    form.id.value = slide.id;
    form.active.value = slide.active;
    form.title.value = slide.title || '';
    form.subtitle.value = slide.subtitle || '';
    form.image_url.value = slide.image_url || '';
    form.link.value = slide.link || '';
    
    // تحديد الكوبون المختار (القائمة ممتلئة مسبقاً من switchTab)
    if (form.coupon_code) {
        form.coupon_code.value = slide.coupon_code || '';
    }
    
    // إظهار المودال فوراً
    const modal = document.getElementById('edit-slider-modal');
    if(modal) modal.classList.remove('hidden');
}

const editSliderForm = document.getElementById('edit-slider-form');
if(editSliderForm) {
    editSliderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.innerText;
        btn.innerText = 'جاري الحفظ...';
        btn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            const res = await fetch(`${API_URL}?action=updateSlider`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            const result = await res.json();
            
            if(result.success) {
                showToast('تم تحديث العرض بنجاح', 'success');
                document.getElementById('edit-slider-modal').classList.add('hidden');
                loadSlider();
            } else throw new Error(result.error);
        } catch(err) {
            showToast('فشل التحديث: ' + err.message, 'error');
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });
}

async function toggleSlider(id, newState) {
    const statusStr = newState ? 'TRUE' : 'FALSE';
    showToast('جاري تحديث الحالة...', 'info');
    try {
        await fetch(`${API_URL}?action=updateSlider`, {
            method: 'POST',
            body: JSON.stringify({ id: id, active: statusStr })
        });
        loadSlider();
    } catch(e) { showToast('فشل التحديث', 'error'); }
}

function deleteSlider(id) {
    showConfirm('حذف هذا العرض نهائياً؟', async () => {
        try {
            await fetch(`${API_URL}?action=deleteSlider`, {
                method: 'POST',
                body: JSON.stringify({ id: id })
            });
            showToast('تم الحذف', 'success');
            loadSlider();
        } catch(e) { showToast('فشل الحذف', 'error'); }
    });
}


// === SETTINGS ===
async function loadSettings(preloadedData = null) {
    try {
        let settings = preloadedData;
        if (!settings) {
            const res = await fetch(`${API_URL}?action=getSettings`);
            settings = await res.json();
        }
        if (settings.site_logo) {
            const logoUrl = getImageUrl(settings.site_logo);
            const favicon = document.getElementById('favicon-icon');
            if (favicon) {
                favicon.href = logoUrl;
            }
        }
        for(const [key, val] of Object.entries(settings)) {
            const el = document.getElementById('set-' + key);
            if(el) el.value = val;
        }
        
        const form = document.getElementById('settings-form');
        if (form && !document.getElementById('set-user')) {
            const authSection = document.createElement('div');
            authSection.className = 'space-y-4 pt-4 border-t border-white/10 mt-4';
            authSection.innerHTML = `
                <h3 class="text-gold font-bold text-lg border-b border-white/10 pb-2">بيانات الدخول (Admin)</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="text-sm text-gray-400">اسم المستخدم</label><input type="text" name="user" id="set-user" class="input-field" value="${settings.user || 'admin'}"></div>
                    <div><label class="text-sm text-gray-400">كلمة المرور</label><input type="text" name="password" id="set-password" class="input-field" value="${settings.password || '123456'}"></div>
                </div>
            `;
            const submitBtn = form.querySelector('button[type="submit"]');
            form.insertBefore(authSection, submitBtn);
        } else if(document.getElementById('set-user')) {
            document.getElementById('set-user').value = settings.user || 'admin';
            document.getElementById('set-password').value = settings.password || '123456';
        }
    } catch(e) { console.log('Error loading settings', e); }
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = 'جاري الحفظ...';
    btn.disabled = true;
    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const res = await fetch(`${API_URL}?action=updateSettings`, { method: 'POST', body: JSON.stringify(data) });
        const result = await res.json();
        if(result.success) showToast('تم الحفظ', 'success');
        else showToast('فشل الحفظ: ' + (result.error || ''), 'error');
    } catch(e) { showToast('خطأ في الاتصال', 'error'); } finally { btn.innerHTML = 'حفظ التغييرات'; btn.disabled = false; }
});

// === ORDERS (TABLE VIEW) ===
async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>';
    
    try {
        const res = await fetch(`${API_URL}?action=getOrders`);
        const orders = await res.json();
        allOrdersData = orders;
        renderOrders(allOrdersData);
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400 p-8">فشل تحميل الطلبات</td></tr>';
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    if(!tbody) return;
    if(!orders.length) { 
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">لا توجد طلبات</td></tr>'; 
        return; 
    }

    const statusOptions = ['جديد', 'تم الاستلام', 'جاري التحضير', 'تم الشحن', 'تم التسليم', 'ملغي'];

    tbody.innerHTML = orders.map(order => {
        const cleanStatus = statusOptions.find(s => order.status && order.status.includes(s)) || 'جديد';
        
        return `
        <tr class="hover:bg-white/5 transition border-b border-white/5 last:border-0 cursor-pointer" onclick="viewOrderDetails('${order.order_id}')">
            <td class="p-4 font-bold text-gray-300">#${order.order_id || 'NA'}</td>
            <td class="p-4 text-xs text-gray-400">${order.date}</td>
            <td class="p-4">
                <div class="font-bold">${order.customer_name}</div>
                <div class="text-xs text-gray-400">${order.phone}</div>
            </td>
            <td class="p-4 font-bold text-gold">${order.total_price}</td>
            <td class="p-4" onclick="event.stopPropagation()">
                <select onchange="updateStatus('${order.order_id}', this.value)" class="bg-gray-800 text-white text-xs rounded p-1 border border-gray-600 focus:border-gold outline-none cursor-pointer">
                    ${statusOptions.map(opt => `<option value="${opt}" ${cleanStatus === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            </td>
            <td class="p-4 text-center" onclick="event.stopPropagation()">
                <button onclick="viewOrderDetails('${order.order_id}')" class="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition" title="عرض التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

function filterOrders(term) {
    const lowerTerm = term.toLowerCase();
    const filtered = allOrdersData.filter(order => 
        (order.customer_name && order.customer_name.toLowerCase().includes(lowerTerm)) || 
        (order.phone && order.phone.toString().includes(lowerTerm)) || 
        (order.order_id && order.order_id.toString().toLowerCase().includes(lowerTerm))
    );
    renderOrders(filtered);
}


// [admin.js] دالة عرض تفاصيل الطلب (محدثة لدعم الخصم)
function viewOrderDetails(orderId) {
    const order = allOrdersData.find(o => String(o.order_id) === String(orderId));
    if (!order) return;

    // 1. البيانات الأساسية
    document.getElementById('modal-order-id').innerText = `#${order.order_id}`;
    document.getElementById('modal-order-status').innerText = order.status;
    document.getElementById('modal-order-date').innerText = order.date;
    
    // 2. بيانات العميل
    document.getElementById('modal-customer-name').innerText = order.customer_name;
    document.getElementById('modal-customer-phone').innerText = order.phone;
    document.getElementById('modal-customer-email').innerText = order.email || '-';
    document.getElementById('modal-customer-address').innerText = order.address;

    // 3. المنتجات
    const itemsContainer = document.getElementById('modal-order-items');
    if (order.items) {
        const itemsList = order.items.split(' | ');
        itemsContainer.innerHTML = itemsList.map(item => `
            <div class="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/5">
                <i class="fas fa-book text-gold text-xs"></i>
                <span class="text-gray-200">${item}</span>
            </div>
        `).join('');
    } else {
        itemsContainer.innerHTML = '<span class="text-gray-500 italic">لا توجد منتجات</span>';
    }

    // 4. الحسابات المالية (تم التحديث هنا لإظهار الخصم) 💰
    const total = parseFloat(order.total_price) || 0;
    const shipping = parseFloat(order.shipping_cost) || 0;
    const discount = parseFloat(order.discount_amount) || 0;
    
    // حساب سعر الكتب: إذا لم يكن محفوظاً، نستنتجه (الإجمالي + الخصم - الشحن)
    const booksPrice = parseFloat(order.books_price) || (total + discount - shipping);

    document.getElementById('modal-books-price').innerText = booksPrice + ' ج.م';
    document.getElementById('modal-order-gov').innerText = order.governorate || 'غير محدد';
    document.getElementById('modal-shipping-cost').innerText = shipping + ' ج.م';
    document.getElementById('modal-order-total-final').innerText = total + ' ج.م';

    // التعامل مع سطر الخصم (إظهار/إخفاء)
    const discountRow = document.getElementById('modal-discount-row');
    if (discount > 0) {
        // إذا وجد خصم، نعرض السطر ونملأ البيانات
        discountRow.classList.remove('hidden');
        discountRow.classList.add('flex'); // لضمان تنسيق الـ flex
        document.getElementById('modal-coupon-code').innerText = order.coupon_code || '';
        document.getElementById('modal-discount-amount').innerText = '-' + discount + ' ج.م';
    } else {
        // إذا لا يوجد خصم، نخفي السطر تماماً
        discountRow.classList.add('hidden');
        discountRow.classList.remove('flex');
    }

    // 5. سجل الحالات (Timeline)
    let historyHtml = '';
    if (order.date) historyHtml += historyItem('تم الإنشاء', order.date, 'gray');
    if (order.date_preparing) historyHtml += historyItem('جاري التحضير', order.date_preparing, 'blue');
    if (order.date_shipped) historyHtml += historyItem('تم الشحن', order.date_shipped, 'yellow');
    if (order.date_delivered) historyHtml += historyItem('تم التسليم', order.date_delivered, 'green');
    if (order.date_cancelled) historyHtml += historyItem('تم الإلغاء', order.date_cancelled, 'red');
    
    document.getElementById('modal-order-history').innerHTML = historyHtml || '<div class="text-gray-500 italic">لا توجد تحديثات</div>';

    // 6. تفعيل زر الحذف
    const delBtn = document.getElementById('btn-delete-order');
    if(delBtn) delBtn.onclick = () => deleteOrderFinal(order.order_id);

    // إظهار المودال
    document.getElementById('order-details-modal').classList.remove('hidden');
}
// دالة مساعدة صغيرة لرسم عناصر التايم لاين
function historyItem(label, date, color) {
    const colors = {
        gray: 'text-gray-400 border-gray-600 bg-gray-500',
        blue: 'text-blue-400 border-blue-500 bg-blue-500',
        yellow: 'text-yellow-400 border-yellow-500 bg-yellow-500',
        green: 'text-green-400 border-green-500 bg-green-500',
        red: 'text-red-400 border-red-500 bg-red-500'
    };
    const c = colors[color];
    return `
    <div class="flex justify-between ${c.split(' ')[0]} border-l-2 ${c.split(' ')[1]} pl-3 pb-3 relative">
        <div class="absolute -left-[5px] top-0 w-2 h-2 ${c.split(' ')[2]} rounded-full"></div>
        <span>${label}</span>
        <span class="text-xs font-mono opacity-75">${date}</span>
    </div>`;
}

function updateStatus(id, newStatus) {
    // استخدام showConfirm بدلاً من alert/confirm العادية
    showConfirm(`تغيير حالة الطلب إلى "${newStatus}"؟`, async () => {
        showToast('جاري التحديث...', 'info');
        try {
            await fetch(`${API_URL}?action=updateOrderStatus`, { 
                method: 'POST', 
                body: JSON.stringify({ order_id: id, status: newStatus }) 
            });
            showToast('تم التحديث', 'success');
            
            const orderIndex = allOrdersData.findIndex(o => o.order_id === id);
            if(orderIndex > -1) { 
                allOrdersData[orderIndex].status = newStatus; 
            }
            renderOrders(allOrdersData); 
        } catch(e) { showToast('فشل التحديث', 'error'); }
    });
}

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

    if (id) {
        return `https://lh3.googleusercontent.com/d/${id}`;
    }
    
    return url;
}

function deleteOrderFinal(orderId) {
    showConfirm(`هل أنت متأكد من حذف الطلب #${orderId} نهائياً من قاعدة البيانات؟`, async () => {
        const btn = document.getElementById('btn-delete-order');
        const oldText = btn ? btn.innerHTML : '';
        if(btn) btn.innerHTML = 'جاري الحذف...';
        
        try {
            const res = await fetch(`${API_URL}?action=deleteOrder`, {
                method: 'POST',
                body: JSON.stringify({ order_id: orderId })
            });
            const result = await res.json();
            
            if(result.success) {
                showToast('تم حذف الطلب بنجاح', 'success');
                document.getElementById('order-details-modal').classList.add('hidden');
                // حذف الطلب من المصفوفة المحلية وتحديث الجدول دون إعادة التحميل
                allOrdersData = allOrdersData.filter(o => o.order_id !== orderId);
                renderOrders(allOrdersData);
            } else {
                throw new Error(result.error);
            }
        } catch(e) {
            showToast('فشل الحذف: ' + e.message, 'error');
            if(btn) btn.innerHTML = oldText;
        }
    });
}

// إخفاء حقل "القيمة" إذا كان النوع شحن مجاني
function toggleCouponFields(type) {
    const valField = document.getElementById('coupon-value-field');
    const maxField = document.getElementById('coupon-max-field');
    
    if (type === 'free_shipping') {
        valField.style.display = 'none';
        valField.value = 0;
    } else {
        valField.style.display = 'block';
    }

    if (type === 'percent') {
        maxField.style.display = 'block';
    } else {
        maxField.style.display = 'none';
    }
}
// === إدارة الكوبونات ===
async function loadCoupons() {
    const tbody = document.getElementById('coupons-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8"><div class="loader mx-auto"></div></td></tr>';

    try {
        const res = await fetch(`${API_URL}?action=getCoupons`);
        const coupons = await res.json();
        
        if(!coupons.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">لا توجد كوبونات</td></tr>';
            return;
        }

        tbody.innerHTML = coupons.map(c => `
            <tr class="hover:bg-white/5 transition">
                <td class="p-4 font-mono font-bold text-yellow-400 tracking-wider">${c.code}</td>
                <td class="p-4 text-xs text-gray-300">
                    ${c.type === 'percent' ? 'نسبة مئوية' : c.type === 'free_shipping' ? 'شحن مجاني' : 'مبلغ ثابت'}
                </td>
                <td class="p-4 font-bold text-white">
                    ${c.type === 'percent' ? c.value + '%' : c.type === 'free_shipping' ? 'مجاني' : c.value + ' ج.م'}
                </td>
                <td class="p-4 text-xs">
                    <span class="${c.usage_count >= c.usage_limit && c.usage_limit > 0 ? 'text-red-400' : 'text-green-400'}">
                        ${c.usage_count} / ${c.usage_limit || '∞'}
                    </span>
                </td>
                <td class="p-4 text-xs text-gray-400">${c.expiry_date ? c.expiry_date.split('T')[0] : 'مفتوح'}</td>
                <td class="p-4 text-center">
                    <button onclick="deleteCoupon('${c.id}')" class="text-red-500 hover:text-red-400 bg-red-500/10 p-2 rounded-lg transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400">خطأ في التحميل</td></tr>';
    }
}

// إضافة كوبون جديد
document.getElementById('add-coupon-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = 'جاري الإنشاء...';
    btn.disabled = true;

    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.active = 'TRUE'; // تفعيل افتراضي

        const res = await fetch(`${API_URL}?action=addCoupon`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if(result.success) {
            showToast('تم إنشاء الكوبون بنجاح', 'success');
            e.target.reset();
            loadCoupons();
        } else {
            throw new Error(result.error);
        }
    } catch(err) {
        showToast('فشل العملية: ' + err.message, 'error');
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
});

// حذف كوبون
function deleteCoupon(id) {
    showConfirm('حذف هذا الكوبون نهائياً؟', async () => {
        try {
            await fetch(`${API_URL}?action=deleteCoupon`, {
                method: 'POST',
                body: JSON.stringify({ id: id })
            });
            showToast('تم الحذف', 'success');
            loadCoupons();
        } catch(e) { showToast('فشل الحذف', 'error'); }
    });
}


async function populateSliderCoupons() {
    const selects = document.querySelectorAll('.slider-coupon-select');
    if (!selects.length) return;
    selects.forEach(s => s.innerHTML = '<option>جاري التحميل...</option>');
    try {
        const res = await fetch(`${API_URL}?action=getCoupons`);
        const coupons = await res.json();
        let optionsHtml = `<option value="">-- بدون كوبون --</option>`;
        if (Array.isArray(coupons) && coupons.length > 0) {
            optionsHtml += coupons
                .filter(c => String(c.active).toUpperCase().trim() === 'TRUE')
                .map(c => `<option value="${c.code}">${c.code} (${c.type === 'percent' ? c.value + '%' : c.value + ' ج.م'})</option>`)
                .join('');
        }

        selects.forEach(select => {
            const oldVal = select.value; 
            select.innerHTML = optionsHtml;
            if(oldVal) select.value = oldVal;
        });

    } catch (e) {
        console.error(e);
        selects.forEach(s => s.innerHTML = '<option value="">فشل التحميل</option>');
    }
}