// 🔴 تأكد من استبدال هذا الرابط بالرابط الجديد الذي ستحصل عليه من الخطوة السابقة
const API_URL = 'https://script.google.com/macros/s/AKfycbydscDFuy-IKcjWbHkAJ0w05vF91QWxDuvyM9TqFW_AbGSwW88EwL7h7Qg3JjmMbUN0/exec';

let allBooksData = [];
let allOrdersData = [];
let allSliderData = []; 

// === Auth & Navigation ===
async function adminLogin() {
    const userInput = document.getElementById('admin-user'); 
    const passInput = document.getElementById('admin-pass');
    const btn = document.querySelector('#login-modal button');
    
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
    const passInput = document.getElementById('admin-pass');
    if(passInput && !document.getElementById('admin-user')) {
        const userField = document.createElement('input');
        userField.type = 'text';
        userField.id = 'admin-user';
        userField.placeholder = 'اسم المستخدم';
        userField.className = 'input-field mb-4 text-center text-lg';
        passInput.parentElement.insertBefore(userField, passInput);
    }
    
    // Inventory Search Listener
    const invSearch = document.getElementById('inventory-search');
    if(invSearch) invSearch.addEventListener('input', (e) => filterInventory(e.target.value));

    // Orders Search Listener
    const ordSearch = document.getElementById('orders-search');
    if(ordSearch) ordSearch.addEventListener('input', (e) => filterOrders(e.target.value));
});

function switchTab(tabId) {
    document.querySelectorAll('.admin-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('bg-white/5', 'text-white');
        btn.classList.add('text-gray-400');
    });
    
    const activeBtn = Array.from(document.querySelectorAll('.admin-tab-btn')).find(b => b.onclick.toString().includes(tabId));
    if(activeBtn) {
        activeBtn.classList.add('bg-white/5', 'text-white');
        activeBtn.classList.remove('text-gray-400');
    }

    if(tabId === 'inventory') loadInventory();
    if(tabId === 'orders') loadOrders();
    if(tabId === 'slider') loadSlider(); 
}

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

function renderInventory(books) {
    const tbody = document.getElementById('inventory-table-body');
    if(!books.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-gray-500">لا توجد نتائج</td></tr>';
        return;
    }
tbody.innerHTML = books.map(book => `
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
        <td class="p-4"><div class="text-gold font-bold">${book.price} ج.م</div>${book.discount > 0 ? `<div class="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded inline-block">خصم ${book.discount}</div>` : ''}</td>
        <td class="p-4"><span class="font-bold ${book.stock > 5 ? 'text-green-400' : 'text-red-400'}">${book.stock}</span></td>
        <td class="p-4">
            <div class="text-xs text-gray-300 mb-1">${book.category || 'عام'}</div>
            <span class="text-[10px] bg-gray-700 px-2 py-1 rounded text-gray-400">${book.language || '-'}</span>
        </td>
        <td class="p-4 text-center">
            <div class="flex justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                <button onclick='openEditModal(${JSON.stringify(book)})' class="bg-blue-600 p-2 rounded text-white hover:bg-blue-500"><i class="fas fa-edit"></i></button>
                <button onclick="deleteBook('${book.id}')" class="bg-red-600 p-2 rounded text-white hover:bg-red-500"><i class="fas fa-trash"></i></button>
            </div>
        </td>
    </tr>
`).join('');
}

function filterInventory(term) {
    const lowerTerm = term.toLowerCase();
    const filtered = allBooksData.filter(book => (book.title && book.title.toLowerCase().includes(lowerTerm)) || (book.author && book.author.toLowerCase().includes(lowerTerm)));
    renderInventory(filtered);
}

function openEditModal(book) {
    const form = document.getElementById('edit-book-form');
    form.id.value = book.id || '';
    form.title.value = book.title || '';
    form.author.value = book.author || '';
    form.price.value = book.price || '';
    form.stock.value = book.stock || '';
    form.discount.value = book.discount || 0;
    form.category.value = book.category || 'روايات';
    
    // التعديل هنا: استخدام الحقول الجديدة
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

async function deleteBook(id) {
    if(!confirm('هل أنت متأكد تماماً من حذف هذا الكتاب؟')) return;
    showToast('جاري الحذف...', 'info');
    try {
        const response = await fetch(`${API_URL}?action=deleteBook`, { method: 'POST', body: JSON.stringify({ id: id }) });
        const result = await response.json();
        if(result.success) { showToast('تم الحذف بنجاح', 'success'); loadInventory(); }
        else showToast('فشل الحذف', 'error');
    } catch(e) { showToast('خطأ في الاتصال', 'error'); }
}

// === SLIDER MANAGEMENT ===
async function loadSlider() {
    const container = document.getElementById('slider-list-container');
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
            return `
            <div class="glass p-4 rounded-xl border ${isActive ? 'border-green-500/30' : 'border-red-500/30'} flex flex-col md:flex-row gap-4 items-center">
                <img src="${getImageUrl(slide.image_url)}" class="w-32 h-20 object-cover rounded-lg border border-white/10" onerror="this.src='https://via.placeholder.com/150x80'">
                <div class="flex-1 text-center md:text-right">
                    <h4 class="font-bold text-lg text-white">${slide.title || 'بدون عنوان'}</h4>
                    <p class="text-sm text-gray-400">${slide.subtitle || ''}</p>
                    ${slide.link ? `<a href="${slide.link}" target="_blank" class="text-xs text-blue-400 hover:underline truncate block max-w-[200px]">${slide.link}</a>` : ''}
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="toggleSlider('${slide.id}', ${!isActive})" class="${isActive ? 'bg-green-600' : 'bg-red-600'} text-white text-xs px-3 py-1 rounded-full font-bold">
                        ${isActive ? 'مفعل' : 'معطل'}
                    </button>
                    <button onclick="deleteSlider('${slide.id}')" class="bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white p-2 rounded-lg transition"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `}).join('');
    } catch(err) {
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

async function deleteSlider(id) {
    if(!confirm('حذف هذا العرض نهائياً؟')) return;
    try {
        await fetch(`${API_URL}?action=deleteSlider`, {
            method: 'POST',
            body: JSON.stringify({ id: id })
        });
        showToast('تم الحذف', 'success');
        loadSlider();
    } catch(e) { showToast('فشل الحذف', 'error'); }
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
            // نستخدم دالة getImageUrl الموجودة في الملف لضمان عمل روابط الدرايف
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
        if (!document.getElementById('set-user')) {
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
        } else {
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
    if(!orders.length) { 
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-500">لا توجد طلبات</td></tr>'; 
        return; 
    }

    const statusOptions = ['جديد', 'تم الاستلام', 'جاري التحضير', 'تم الشحن', 'تم التسليم', 'ملغي'];

    tbody.innerHTML = orders.map(order => {
        const cleanStatus = statusOptions.find(s => order.status && order.status.includes(s)) || 'جديد';
        const badgeColor = cleanStatus === 'تم التسليم' ? 'bg-green-500/20 text-green-400' : 
                           cleanStatus === 'ملغي' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400';

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

// === NEW: Order Details Modal ===
function viewOrderDetails(orderId) {
    const order = allOrdersData.find(o => String(o.order_id) === String(orderId));
    if (!order) return;

    // Fill Modal Data
    document.getElementById('modal-order-id').innerText = `#${order.order_id}`;
    document.getElementById('modal-order-status').innerText = order.status;
    document.getElementById('modal-order-date').innerText = order.date;
    
    document.getElementById('modal-customer-name').innerText = order.customer_name;
    document.getElementById('modal-customer-phone').innerText = order.phone;
    document.getElementById('modal-customer-email').innerText = order.email || '-';
    document.getElementById('modal-customer-address').innerText = order.address;
    
    document.getElementById('modal-order-items').innerText = order.items; // You might want to format this if items are structured
    document.getElementById('modal-order-total').innerText = order.total_price;

    // Build History/Timeline based on available dates
    let historyHtml = '';
    if (order.date) historyHtml += `<div class="flex justify-between text-gray-400 border-l-2 border-gray-600 pl-3 pb-3 relative"><div class="absolute -left-[5px] top-0 w-2 h-2 bg-gray-500 rounded-full"></div><span>تم الإنشاء</span><span>${order.date}</span></div>`;
    
    // Check for other dates if they exist in your sheet (based on Apps Script modification)
    if (order.date_preparing) historyHtml += `<div class="flex justify-between text-blue-400 border-l-2 border-blue-500 pl-3 pb-3 relative"><div class="absolute -left-[5px] top-0 w-2 h-2 bg-blue-500 rounded-full"></div><span>جاري التحضير</span><span>${order.date_preparing}</span></div>`;
    if (order.date_shipped) historyHtml += `<div class="flex justify-between text-yellow-400 border-l-2 border-yellow-500 pl-3 pb-3 relative"><div class="absolute -left-[5px] top-0 w-2 h-2 bg-yellow-500 rounded-full"></div><span>تم الشحن</span><span>${order.date_shipped}</span></div>`;
    if (order.date_delivered) historyHtml += `<div class="flex justify-between text-green-400 border-l-2 border-green-500 pl-3 relative"><div class="absolute -left-[5px] top-0 w-2 h-2 bg-green-500 rounded-full"></div><span>تم التسليم</span><span>${order.date_delivered}</span></div>`;
    if (order.date_cancelled) historyHtml += `<div class="flex justify-between text-red-400 border-l-2 border-red-500 pl-3 relative"><div class="absolute -left-[5px] top-0 w-2 h-2 bg-red-500 rounded-full"></div><span>تم الإلغاء</span><span>${order.date_cancelled}</span></div>`;

    document.getElementById('modal-order-history').innerHTML = historyHtml || '<div class="text-gray-500 italic">لا توجد تحديثات إضافية</div>';

    document.getElementById('order-details-modal').classList.remove('hidden');
}

async function updateStatus(id, newStatus) {
    if(!confirm(`تغيير حالة الطلب إلى "${newStatus}"؟`)) { renderOrders(allOrdersData); return; }
    
    // Add date only to server data, keep simple status for select
    const statusWithDate = `${newStatus} (${new Date().toLocaleDateString('en-GB')})`;
    
    showToast('جاري التحديث...', 'info');
    try {
        await fetch(`${API_URL}?action=updateOrderStatus`, { 
            method: 'POST', 
            body: JSON.stringify({ order_id: id, status: newStatus }) // Apps Script handles logic now
        });
        showToast('تم التحديث', 'success');
        
        const orderIndex = allOrdersData.findIndex(o => o.order_id === id);
        if(orderIndex > -1) { 
            allOrdersData[orderIndex].status = newStatus; // Update local view
            // In a real app, you might want to reload to get the server-generated date, 
            // but for UI responsiveness we update status immediately.
        }
        renderOrders(allOrdersData); 
    } catch(e) { showToast('فشل التحديث', 'error'); }
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

    // إذا وجدنا الـ ID، نستخدم رابط lh3 السريع
    if (id) {
        return `https://lh3.googleusercontent.com/d/${id}`;
    }
    
    return url;
}