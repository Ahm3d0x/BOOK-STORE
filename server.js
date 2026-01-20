/**
 * 🚀 Ultimate E-commerce Backend v5.0 (Full Features)
 * Developed for Book.com
 */

const SCRIPT_PROP = PropertiesService.getScriptProperties();

// ==========================================
// 1. معالجة طلبات القراءة (GET)
// ==========================================
// [Code.gs] استبدل دالة doGet بالكامل بهذه النسخة السريعة 👇

function doGet(e) {

  
  let result = {};
  
  try {
    const action = e.parameter ? e.parameter.action : '';
    const db = getDb();

    if (!action) throw new Error("No action specified");

    switch(action) {
      case 'getBooks':
        result = getData(db.books).reverse(); 
        break;

      case 'getSettings':
        const settingsArr = getData(db.settings);
        result = settingsArr.reduce((acc, curr) => {
          if(curr.key) acc[curr.key] = curr.value;
          return acc;
        }, {});
        break;

      case 'getOrders':
         result = getData(db.orders).reverse();
         break;

      case 'getSlider':
         result = getData(db.slider);
         break;
         
      case 'getCoupons':
         result = getData(db.coupons);
         break;

      case 'ping':
         result = { status: 'alive', time: new Date().toString() };
         break;

      default:
        result = { error: 'Invalid Action' };
    }

  } catch (err) {
    result = { error: err.toString(), stack: err.stack };
  }
  
  return sendJSON(result);
}

// ==========================================
// 2. معالجة طلبات الكتابة (POST)
// ==========================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  // قفل السكريبت لمدة 30 ثانية لضمان عدم تضارب المخزون أو الكوبونات
  if (!lock.tryLock(30000)) {
    return sendJSON({ error: "Server is busy processing another order, please try again." });
  }

  let result = {};

  try {
    if (!e.postData || !e.postData.contents) throw new Error("No data received");
    
    const requestData = JSON.parse(e.postData.contents);
    const action = e.parameter.action;
    const db = getDb();

    switch(action) {
      
      // ===================================
      // 🏷️ منطق الكوبونات (Validation)
      // ===================================
      case 'validateCoupon':
         const coupons = getData(db.coupons);
         const codeInput = String(requestData.code).trim().toUpperCase();
         const orderTotal = Number(requestData.total) || 0;
         
         // البحث عن الكوبون
         const coupon = coupons.find(c => String(c.code).trim().toUpperCase() === codeInput);

         if (!coupon) {
             result = { success: false, message: 'كود الكوبون غير صحيح' };
         } else if (String(coupon.active).toUpperCase().trim() !== 'TRUE') {
             result = { success: false, message: 'هذا الكوبون غير مفعل حالياً' };
         } else {
             // 1. التحقق من تاريخ الانتهاء
             if (coupon.expiry_date) {
                 const today = new Date();
                 today.setHours(0,0,0,0);
                 const expDate = parseDate(coupon.expiry_date);
                 
                 if (expDate && expDate < today) {
                     result = { success: false, message: 'انتهت صلاحية هذا الكوبون' };
                     break; 
                 }
             }

             // 2. التحقق من حد الاستخدام (Usage Limit)
             const limit = Number(coupon.usage_limit);
             const count = Number(coupon.usage_count) || 0;
             if (limit > 0 && count >= limit) {
                 result = { success: false, message: 'تم استهلاك الحد الأقصى لاستخدام هذا الكوبون' };
                 break;
             }

             // 3. التحقق من الحد الأدنى للطلب
             if (orderTotal < Number(coupon.min_order)) {
                 result = { success: false, message: `يجب أن تكون قيمة الطلب ${coupon.min_order} ج.م على الأقل` };
                 break;
             }

             // الكوبون سليم
             result = { 
               success: true, 
               code: coupon.code,
               type: coupon.type,
               value: Number(coupon.value),
               max_discount: Number(coupon.max_discount) || 0
             };
         }
         break;

      // ===================================
      // 📦 تسجيل الطلب (Core Logic)
      // ===================================
      case 'placeOrder':
        if (!requestData.cartData) throw new Error("السلة فارغة");
        
        // --- أ) معالجة الكوبون وتحديث العداد ---
        if (requestData.coupon_code) {
            const cSheet = db.coupons;
            const cData = cSheet.getDataRange().getValues();
            const cHeaders = cData[0];
            const codeIdx = cHeaders.indexOf('code');
            const countIdx = cHeaders.indexOf('usage_count');
            
            // نتحقق مرة أخرى داخل القفل لضمان عدم تجاوز الحد
            if (codeIdx > -1 && countIdx > -1) {
                let couponFound = false;
                for (let i = 1; i < cData.length; i++) {
                    if (String(cData[i][codeIdx]).toUpperCase() === String(requestData.coupon_code).toUpperCase()) {
                        let currentCount = Number(cData[i][countIdx] || 0);
                        let limit = Number(cData[i][cHeaders.indexOf('usage_limit')] || 0);
                        
                        // فحص أخير للحد الأقصى قبل الخصم الفعلي
                        if (limit > 0 && currentCount >= limit) {
                             throw new Error("عذراً، لقد نفذت كمية الكوبون أثناء إتمام الطلب.");
                        }

                        cSheet.getRange(i + 1, countIdx + 1).setValue(currentCount + 1);
                        couponFound = true;
                        break;
                    }
                }
            }
        }

        // --- ب) تجهيز بيانات الطلب ---
        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const orderDate = new Date().toLocaleString('en-GB');
        
        const newOrder = {
          order_id: orderId,
          date: orderDate,
          customer_name: requestData.customer_name,
          phone: requestData.phone,
          email: requestData.email,
          address: requestData.address,
          items: requestData.items,
          
          // الحقول المالية الجديدة
          books_price: requestData.books_price,
          shipping_cost: requestData.shipping_cost,
          coupon_code: requestData.coupon_code || '',
          discount_amount: requestData.discount_amount || 0,
          total_price: requestData.total_price, // المبلغ النهائي
          
          status: 'جديد',
          date_preparing: '', date_shipped: '', date_delivered: '', date_cancelled: '',
          governorate: requestData.governorate
        };

        // --- ج) خصم المخزون ---
        const cartItems = typeof requestData.cartData === 'string' ? JSON.parse(requestData.cartData) : requestData.cartData;
        const booksSheet = db.books;
        const booksData = booksSheet.getDataRange().getValues();
        const headers = booksData[0];
        const idIdx = headers.indexOf('id');
        const stockIdx = headers.indexOf('stock');
        const statusIdx = headers.indexOf('status');

        cartItems.forEach(item => {
           for (let i = 1; i < booksData.length; i++) {
             if (String(booksData[i][idIdx]) === String(item.id)) {
               let currentStock = Number(booksData[i][stockIdx] || 0);
               let newStock = currentStock - Number(item.qty || 0);
               
               if (newStock < 0) throw new Error(`الكمية غير متوفرة للكتاب: ${booksData[i][headers.indexOf('title')]}`);
               
               booksSheet.getRange(i + 1, stockIdx + 1).setValue(newStock);
               
               if (newStock === 0 && statusIdx > -1) {
                  booksSheet.getRange(i + 1, statusIdx + 1).setValue('غير متوفر');
               }
               break;
             }
           }
        });

        // --- د) حفظ الطلب ---
        addRowDynamic(db.orders, newOrder);

        // --- هـ) إرسال الإيميلات ---
        try { 
            sendEmails(newOrder, db.settings); 
        } catch(emailErr) { 
            console.error("Email Error: " + emailErr); 
        }

        result = { success: true, message: 'تم الطلب بنجاح', orderId: orderId };
        break;

      // ===================================
      // إدارة الكوبونات (Admin)
      // ===================================
      case 'addCoupon':
         requestData.id = Date.now().toString();
         requestData.usage_count = 0;
         // التأكد من حفظ التاريخ بصيغة صحيحة
         if(requestData.expiry_date) requestData.expiry_date = formatDateForSheet(requestData.expiry_date);
         addRowDynamic(db.coupons, requestData);
         result = { success: true };
         break;

      case 'updateCoupon':
         if(requestData.expiry_date) requestData.expiry_date = formatDateForSheet(requestData.expiry_date);
         updateRowDynamic(db.coupons, 'id', requestData.id, requestData);
         result = { success: true };
         break;

      case 'deleteCoupon':
         deleteRowDynamic(db.coupons, 'id', requestData.id);
         result = { success: true };
         break;

      // ===================================
      // إدارة السلايدر (مع دعم الكوبون)
      // ===================================
      case 'addSlider':
         requestData.id = Date.now().toString();
         requestData.active = 'TRUE';
         // يتم حفظ coupon_code تلقائياً بفضل addRowDynamic
         addRowDynamic(db.slider, requestData); 
         result = { success: true };
         break;
         
      case 'updateSlider':
         updateRowDynamic(db.slider, 'id', requestData.id, requestData);
         result = { success: true };
         break;
         
      case 'deleteSlider':
         deleteRowDynamic(db.slider, 'id', requestData.id);
         result = { success: true };
         break;

      // ===================================
      // باقي العمليات (Standard)
      // ===================================
      case 'addBook':
        requestData.id = requestData.id || Date.now().toString();
        requestData.date_added = new Date().toLocaleDateString('en-GB');
        requestData.status = Number(requestData.stock) > 0 ? 'متوفر' : 'غير متوفر';
        addRowDynamic(db.books, requestData);
        result = { success: true, message: 'تم إضافة الكتاب' };
        break;

      case 'updateBook':
        if(requestData.stock !== undefined) requestData.status = Number(requestData.stock) > 0 ? 'متوفر' : 'غير متوفر';
        updateRowDynamic(db.books, 'id', requestData.id, requestData);
        result = { success: true };
        break;

      case 'deleteBook':
        deleteRowDynamic(db.books, 'id', requestData.id);
        result = { success: true };
        break;

      case 'updateOrderStatus':
        const statusMap = { 'جاري التحضير': 'date_preparing', 'تم الشحن': 'date_shipped', 'تم التسليم': 'date_delivered', 'ملغي': 'date_cancelled' };
        const updateData = { status: requestData.status };
        if (statusMap[requestData.status]) updateData[statusMap[requestData.status]] = new Date().toLocaleString('en-GB');
        updateRowDynamic(db.orders, 'order_id', requestData.order_id, updateData);
        result = { success: true };
        break;

      case 'deleteOrder':
         deleteRowDynamic(db.orders, 'order_id', requestData.order_id);
         result = { success: true };
         break;

case 'updateSettings':
         const sSheet = db.settings;
         if (sSheet.getLastRow() > 1) sSheet.getRange(2, 1, sSheet.getLastRow() - 1, sSheet.getLastColumn()).clearContent();
         const newSettingsRows = [];
         
         for (const [k, v] of Object.entries(requestData)) { 
             if(k !== 'action') {
                 let finalVal = v;
                 // ✅ الحل السحري: إذا القيمة تبدأ بصفر وهي رقم (مثل الهاتف)، نضع قبلها '
                 if (String(v).trim().startsWith('0') && !isNaN(v)) {
                     finalVal = "'" + v;
                 }
                 newSettingsRows.push([k, finalVal]);
             }
         }
         
         if(newSettingsRows.length > 0) sSheet.getRange(2, 1, newSettingsRows.length, 2).setValues(newSettingsRows);
         result = { success: true };
         break;
      default:
        throw new Error("Invalid Action Type");
    }

  } catch (err) {
    result = { error: err.toString(), stack: err.stack };
  } finally {
    lock.releaseLock();
  }

  return sendJSON(result);
}

// ==========================================
// 3. الدوال المساعدة (Helpers)
// ==========================================

function getDb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    books: ss.getSheetByName('Books'),
    orders: ss.getSheetByName('Orders'),
    settings: ss.getSheetByName('Settings'),
    slider: ss.getSheetByName('Slider'),
    coupons: ss.getSheetByName('Coupons')
  };
}

function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getData(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows.shift();
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      let val = row[i];
      // تحويل التواريخ لنص مقروء لتجنب مشاكل JSON
      if (val instanceof Date) val = val.toLocaleDateString('en-GB'); 
      obj[header] = val;
    });
    return obj;
  });
}


function addRowDynamic(sheet, dataObj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // ✅ قائمة الحقول التي يجب أن تعامل كنص دائماً (لمنع حذف الأصفار أو تغيير التنسيق)
  const textColumns = ['title', 'author', 'publisher', 'description', 'phone', 'code', 'coupon_code', 'items', 'order_id', 'tags'];

  const newRow = headers.map(header => {
    let val = (dataObj[header] !== undefined && dataObj[header] !== null) ? dataObj[header] : '';
    
    // شرط 1: إذا كان العمود من ضمن القائمة النصية، نضع قبله ' فوراً
    if (textColumns.includes(header) && String(val).trim() !== '') {
        return "'" + val;
    }

    // شرط 2: حماية إضافية لأي رقم يبدأ بصفر (للحقول الأخرى غير المعرفة)
    if (String(val).startsWith('0') && String(val).length > 1 && !isNaN(val)) {
       return "'" + val;
    }
    return val;
  });
  sheet.appendRow(newRow);
}

function updateRowDynamic(sheet, idColName, idValue, dataObj) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColName);
  

  const textColumns = ['title', 'author', 'publisher', 'description', 'phone', 'code', 'coupon_code', 'items', 'order_id', 'tags'];

  if (idIdx === -1) return;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(idValue)) {
      headers.forEach((header, colIdx) => {
        if (dataObj.hasOwnProperty(header)) {
            let val = dataObj[header];
            
            // تطبيق نفس الحماية عند التحديث
            if (textColumns.includes(header) && String(val).trim() !== '') {
                val = "'" + val;
            } else if (String(val).startsWith('0') && String(val).length > 1 && !isNaN(val)) {
                val = "'" + val;
            }
            
            sheet.getRange(i + 1, colIdx + 1).setValue(val);
        }
      });
      return;
    }
  }
}

function deleteRowDynamic(sheet, idColName, idValue) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColName);
  if (idIdx === -1) return;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(idValue)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// دالة متطورة لتحليل التاريخ
function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  // التعامل مع صيغة DD/MM/YYYY
  if (String(dateStr).includes('/')) {
    const parts = dateStr.split('/');
    // افتراض الترتيب يوم/شهر/سنة
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  // التعامل مع صيغة YYYY-MM-DD
  return new Date(dateStr);
}

function formatDateForSheet(dateStr) {
   // تأكد من أن التاريخ يُحفظ بصيغة نصية ثابتة في الشيت
   const d = new Date(dateStr);
   if(isNaN(d.getTime())) return dateStr; // إذا لم يكن تاريخاً صالحاً أعده كما هو
   return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

/**
 * 🚀 Ultimate E-commerce Backend v5.0 (Full Features)
 * Developed for Book.com
 */

const SCRIPT_PROP = PropertiesService.getScriptProperties();

// ==========================================
// 1. معالجة طلبات القراءة (GET)
// ==========================================
// [Code.gs] استبدل دالة doGet بالكامل بهذه النسخة السريعة 👇

function doGet(e) {

  
  let result = {};
  
  try {
    const action = e.parameter ? e.parameter.action : '';
    const db = getDb();

    if (!action) throw new Error("No action specified");

    switch(action) {
      case 'getBooks':
        result = getData(db.books).reverse(); 
        break;

      case 'getSettings':
        const settingsArr = getData(db.settings);
        result = settingsArr.reduce((acc, curr) => {
          if(curr.key) acc[curr.key] = curr.value;
          return acc;
        }, {});
        break;

      case 'getOrders':
         result = getData(db.orders).reverse();
         break;

      case 'getSlider':
         result = getData(db.slider);
         break;
         
      case 'getCoupons':
         result = getData(db.coupons);
         break;

      case 'ping':
         result = { status: 'alive', time: new Date().toString() };
         break;

      default:
        result = { error: 'Invalid Action' };
    }

  } catch (err) {
    result = { error: err.toString(), stack: err.stack };
  }
  
  return sendJSON(result);
}

// ==========================================
// 2. معالجة طلبات الكتابة (POST)
// ==========================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  // قفل السكريبت لمدة 30 ثانية لضمان عدم تضارب المخزون أو الكوبونات
  if (!lock.tryLock(30000)) {
    return sendJSON({ error: "Server is busy processing another order, please try again." });
  }

  let result = {};

  try {
    if (!e.postData || !e.postData.contents) throw new Error("No data received");
    
    const requestData = JSON.parse(e.postData.contents);
    const action = e.parameter.action;
    const db = getDb();

    switch(action) {
      
      // ===================================
      // 🏷️ منطق الكوبونات (Validation)
      // ===================================
      case 'validateCoupon':
         const coupons = getData(db.coupons);
         const codeInput = String(requestData.code).trim().toUpperCase();
         const orderTotal = Number(requestData.total) || 0;
         
         // البحث عن الكوبون
         const coupon = coupons.find(c => String(c.code).trim().toUpperCase() === codeInput);

         if (!coupon) {
             result = { success: false, message: 'كود الكوبون غير صحيح' };
         } else if (String(coupon.active).toUpperCase().trim() !== 'TRUE') {
             result = { success: false, message: 'هذا الكوبون غير مفعل حالياً' };
         } else {
             // 1. التحقق من تاريخ الانتهاء
             if (coupon.expiry_date) {
                 const today = new Date();
                 today.setHours(0,0,0,0);
                 const expDate = parseDate(coupon.expiry_date);
                 
                 if (expDate && expDate < today) {
                     result = { success: false, message: 'انتهت صلاحية هذا الكوبون' };
                     break; 
                 }
             }

             // 2. التحقق من حد الاستخدام (Usage Limit)
             const limit = Number(coupon.usage_limit);
             const count = Number(coupon.usage_count) || 0;
             if (limit > 0 && count >= limit) {
                 result = { success: false, message: 'تم استهلاك الحد الأقصى لاستخدام هذا الكوبون' };
                 break;
             }

             // 3. التحقق من الحد الأدنى للطلب
             if (orderTotal < Number(coupon.min_order)) {
                 result = { success: false, message: `يجب أن تكون قيمة الطلب ${coupon.min_order} ج.م على الأقل` };
                 break;
             }

             // الكوبون سليم
             result = { 
               success: true, 
               code: coupon.code,
               type: coupon.type,
               value: Number(coupon.value),
               max_discount: Number(coupon.max_discount) || 0
             };
         }
         break;

      // ===================================
      // 📦 تسجيل الطلب (Core Logic)
      // ===================================
      case 'placeOrder':
        if (!requestData.cartData) throw new Error("السلة فارغة");
        
        // --- أ) معالجة الكوبون وتحديث العداد ---
        if (requestData.coupon_code) {
            const cSheet = db.coupons;
            const cData = cSheet.getDataRange().getValues();
            const cHeaders = cData[0];
            const codeIdx = cHeaders.indexOf('code');
            const countIdx = cHeaders.indexOf('usage_count');
            
            // نتحقق مرة أخرى داخل القفل لضمان عدم تجاوز الحد
            if (codeIdx > -1 && countIdx > -1) {
                let couponFound = false;
                for (let i = 1; i < cData.length; i++) {
                    if (String(cData[i][codeIdx]).toUpperCase() === String(requestData.coupon_code).toUpperCase()) {
                        let currentCount = Number(cData[i][countIdx] || 0);
                        let limit = Number(cData[i][cHeaders.indexOf('usage_limit')] || 0);
                        
                        // فحص أخير للحد الأقصى قبل الخصم الفعلي
                        if (limit > 0 && currentCount >= limit) {
                             throw new Error("عذراً، لقد نفذت كمية الكوبون أثناء إتمام الطلب.");
                        }

                        cSheet.getRange(i + 1, countIdx + 1).setValue(currentCount + 1);
                        couponFound = true;
                        break;
                    }
                }
            }
        }

        // --- ب) تجهيز بيانات الطلب ---
        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const orderDate = new Date().toLocaleString('en-GB');
        
        const newOrder = {
          order_id: orderId,
          date: orderDate,
          customer_name: requestData.customer_name,
          phone: requestData.phone,
          email: requestData.email,
          address: requestData.address,
          items: requestData.items,
          
          // الحقول المالية الجديدة
          books_price: requestData.books_price,
          shipping_cost: requestData.shipping_cost,
          coupon_code: requestData.coupon_code || '',
          discount_amount: requestData.discount_amount || 0,
          total_price: requestData.total_price, // المبلغ النهائي
          
          status: 'جديد',
          date_preparing: '', date_shipped: '', date_delivered: '', date_cancelled: '',
          governorate: requestData.governorate
        };

        // --- ج) خصم المخزون ---
        const cartItems = typeof requestData.cartData === 'string' ? JSON.parse(requestData.cartData) : requestData.cartData;
        const booksSheet = db.books;
        const booksData = booksSheet.getDataRange().getValues();
        const headers = booksData[0];
        const idIdx = headers.indexOf('id');
        const stockIdx = headers.indexOf('stock');
        const statusIdx = headers.indexOf('status');

        cartItems.forEach(item => {
           for (let i = 1; i < booksData.length; i++) {
             if (String(booksData[i][idIdx]) === String(item.id)) {
               let currentStock = Number(booksData[i][stockIdx] || 0);
               let newStock = currentStock - Number(item.qty || 0);
               
               if (newStock < 0) throw new Error(`الكمية غير متوفرة للكتاب: ${booksData[i][headers.indexOf('title')]}`);
               
               booksSheet.getRange(i + 1, stockIdx + 1).setValue(newStock);
               
               if (newStock === 0 && statusIdx > -1) {
                  booksSheet.getRange(i + 1, statusIdx + 1).setValue('غير متوفر');
               }
               break;
             }
           }
        });

        // --- د) حفظ الطلب ---
        addRowDynamic(db.orders, newOrder);

        // --- هـ) إرسال الإيميلات ---
        try { 
            sendEmails(newOrder, db.settings); 
        } catch(emailErr) { 
            console.error("Email Error: " + emailErr); 
        }

        result = { success: true, message: 'تم الطلب بنجاح', orderId: orderId };
        break;

      // ===================================
      // إدارة الكوبونات (Admin)
      // ===================================
      case 'addCoupon':
         requestData.id = Date.now().toString();
         requestData.usage_count = 0;
         // التأكد من حفظ التاريخ بصيغة صحيحة
         if(requestData.expiry_date) requestData.expiry_date = formatDateForSheet(requestData.expiry_date);
         addRowDynamic(db.coupons, requestData);
         result = { success: true };
         break;

      case 'updateCoupon':
         if(requestData.expiry_date) requestData.expiry_date = formatDateForSheet(requestData.expiry_date);
         updateRowDynamic(db.coupons, 'id', requestData.id, requestData);
         result = { success: true };
         break;

      case 'deleteCoupon':
         deleteRowDynamic(db.coupons, 'id', requestData.id);
         result = { success: true };
         break;

      // ===================================
      // إدارة السلايدر (مع دعم الكوبون)
      // ===================================
      case 'addSlider':
         requestData.id = Date.now().toString();
         requestData.active = 'TRUE';
         // يتم حفظ coupon_code تلقائياً بفضل addRowDynamic
         addRowDynamic(db.slider, requestData); 
         result = { success: true };
         break;
         
      case 'updateSlider':
         updateRowDynamic(db.slider, 'id', requestData.id, requestData);
         result = { success: true };
         break;
         
      case 'deleteSlider':
         deleteRowDynamic(db.slider, 'id', requestData.id);
         result = { success: true };
         break;

      // ===================================
      // باقي العمليات (Standard)
      // ===================================
      case 'addBook':
        requestData.id = requestData.id || Date.now().toString();
        requestData.date_added = new Date().toLocaleDateString('en-GB');
        requestData.status = Number(requestData.stock) > 0 ? 'متوفر' : 'غير متوفر';
        addRowDynamic(db.books, requestData);
        result = { success: true, message: 'تم إضافة الكتاب' };
        break;

      case 'updateBook':
        if(requestData.stock !== undefined) requestData.status = Number(requestData.stock) > 0 ? 'متوفر' : 'غير متوفر';
        updateRowDynamic(db.books, 'id', requestData.id, requestData);
        result = { success: true };
        break;

      case 'deleteBook':
        deleteRowDynamic(db.books, 'id', requestData.id);
        result = { success: true };
        break;

      case 'updateOrderStatus':
        const statusMap = { 'جاري التحضير': 'date_preparing', 'تم الشحن': 'date_shipped', 'تم التسليم': 'date_delivered', 'ملغي': 'date_cancelled' };
        const updateData = { status: requestData.status };
        if (statusMap[requestData.status]) updateData[statusMap[requestData.status]] = new Date().toLocaleString('en-GB');
        updateRowDynamic(db.orders, 'order_id', requestData.order_id, updateData);
        result = { success: true };
        break;

      case 'deleteOrder':
         deleteRowDynamic(db.orders, 'order_id', requestData.order_id);
         result = { success: true };
         break;

case 'updateSettings':
         const sSheet = db.settings;
         if (sSheet.getLastRow() > 1) sSheet.getRange(2, 1, sSheet.getLastRow() - 1, sSheet.getLastColumn()).clearContent();
         const newSettingsRows = [];
         
         for (const [k, v] of Object.entries(requestData)) { 
             if(k !== 'action') {
                 let finalVal = v;
                 // ✅ الحل السحري: إذا القيمة تبدأ بصفر وهي رقم (مثل الهاتف)، نضع قبلها '
                 if (String(v).trim().startsWith('0') && !isNaN(v)) {
                     finalVal = "'" + v;
                 }
                 newSettingsRows.push([k, finalVal]);
             }
         }
         
         if(newSettingsRows.length > 0) sSheet.getRange(2, 1, newSettingsRows.length, 2).setValues(newSettingsRows);
         result = { success: true };
         break;
      default:
        throw new Error("Invalid Action Type");
    }

  } catch (err) {
    result = { error: err.toString(), stack: err.stack };
  } finally {
    lock.releaseLock();
  }

  return sendJSON(result);
}

// ==========================================
// 3. الدوال المساعدة (Helpers)
// ==========================================

function getDb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    books: ss.getSheetByName('Books'),
    orders: ss.getSheetByName('Orders'),
    settings: ss.getSheetByName('Settings'),
    slider: ss.getSheetByName('Slider'),
    coupons: ss.getSheetByName('Coupons')
  };
}

function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getData(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows.shift();
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      let val = row[i];
      // تحويل التواريخ لنص مقروء لتجنب مشاكل JSON
      if (val instanceof Date) val = val.toLocaleDateString('en-GB'); 
      obj[header] = val;
    });
    return obj;
  });
}


function addRowDynamic(sheet, dataObj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // ✅ قائمة الحقول التي يجب أن تعامل كنص دائماً (لمنع حذف الأصفار أو تغيير التنسيق)
  const textColumns = ['title', 'author', 'publisher', 'description', 'phone', 'code', 'coupon_code', 'items', 'order_id', 'tags'];

  const newRow = headers.map(header => {
    let val = (dataObj[header] !== undefined && dataObj[header] !== null) ? dataObj[header] : '';
    
    // شرط 1: إذا كان العمود من ضمن القائمة النصية، نضع قبله ' فوراً
    if (textColumns.includes(header) && String(val).trim() !== '') {
        return "'" + val;
    }

    // شرط 2: حماية إضافية لأي رقم يبدأ بصفر (للحقول الأخرى غير المعرفة)
    if (String(val).startsWith('0') && String(val).length > 1 && !isNaN(val)) {
       return "'" + val;
    }
    return val;
  });
  sheet.appendRow(newRow);
}

function updateRowDynamic(sheet, idColName, idValue, dataObj) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColName);
  

  const textColumns = ['title', 'author', 'publisher', 'description', 'phone', 'code', 'coupon_code', 'items', 'order_id', 'tags'];

  if (idIdx === -1) return;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(idValue)) {
      headers.forEach((header, colIdx) => {
        if (dataObj.hasOwnProperty(header)) {
            let val = dataObj[header];
            
            // تطبيق نفس الحماية عند التحديث
            if (textColumns.includes(header) && String(val).trim() !== '') {
                val = "'" + val;
            } else if (String(val).startsWith('0') && String(val).length > 1 && !isNaN(val)) {
                val = "'" + val;
            }
            
            sheet.getRange(i + 1, colIdx + 1).setValue(val);
        }
      });
      return;
    }
  }
}

function deleteRowDynamic(sheet, idColName, idValue) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColName);
  if (idIdx === -1) return;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(idValue)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

// دالة متطورة لتحليل التاريخ
function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  // التعامل مع صيغة DD/MM/YYYY
  if (String(dateStr).includes('/')) {
    const parts = dateStr.split('/');
    // افتراض الترتيب يوم/شهر/سنة
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  // التعامل مع صيغة YYYY-MM-DD
  return new Date(dateStr);
}

function formatDateForSheet(dateStr) {
   // تأكد من أن التاريخ يُحفظ بصيغة نصية ثابتة في الشيت
   const d = new Date(dateStr);
   if(isNaN(d.getTime())) return dateStr; // إذا لم يكن تاريخاً صالحاً أعده كما هو
   return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

function sendEmails(order, settingsSheet) {
    // 1. جلب إعدادات الموقع
    let siteName = 'Book.com';
    let adminEmail = '';
    let siteLogoRaw = '';
    let whatsapp = '';
    let facebook = '';
    let instagram = '';
    let contactEmail = '';
    let siteUrl = '#'; 

    try {
        const settings = getData(settingsSheet);
        settings.forEach(s => { 
            if(s.key === 'site_name') siteName = s.value;
            if(s.key === 'site_logo') siteLogoRaw = s.value;
            if(s.key === 'whatsapp') whatsapp = s.value;
            if(s.key === 'facebook') facebook = s.value;
            if(s.key === 'instagram') instagram = s.value;
            if(s.key === 'contact_email') {
                contactEmail = s.value;
                // ✅ التصحيح هنا: نستخدم إيميل التواصل كإيميل للأدمن تلقائياً
                // لأن الكود القديم كان يبحث في صف خاطئ (الصف 4 الذي أصبح لوجو الآن)
                adminEmail = s.value; 
            }
            if(s.key === 'site_url') siteUrl = s.value;
            
            // دعم إضافي: لو قررت لاحقاً إضافة صف مخصص للأدمن باسم admin_email
            if(s.key === 'admin_email') adminEmail = s.value;
        });
        
    } catch(e) {
        Logger.log("Error fetching settings: " + e);
    }

    // 2. معالجة الروابط والصور
    const logoUrl = getEmailImageUrl(siteLogoRaw);
    
    // إصلاح رابط الواتساب
    let waLink = '#';
    if(whatsapp) {
        let cleanNum = String(whatsapp).replace(/[^0-9]/g, '');
        if(cleanNum.startsWith('0')) cleanNum = '2' + cleanNum;
        waLink = `https://wa.me/${cleanNum}`;
    }

    // 3. معالجة قائمة المنتجات (تحويل النص إلى أسطر HTML)
    let itemsHtml = '';
    if (order.items) {
        const itemsList = order.items.split(' | ');
        itemsList.forEach(item => {
            itemsHtml += `
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #333; color: #e0e0e0; font-size: 14px;">
                    🛒 ${item}
                </td>
            </tr>`;
        });
    }

    // 4. معالجة سطر الخصم
    let discountRow = '';
    if (Number(order.discount_amount) > 0) {
        discountRow = `
        <tr>
            <td style="padding: 8px 0; color: #4ade80; font-size: 14px;">قسيمة خصم <span style="background:rgba(74, 222, 128, 0.1); padding:2px 6px; border-radius:4px; font-size:11px;">${order.coupon_code}</span></td>
            <td style="padding: 8px 0; color: #4ade80; text-align: left; font-weight: bold;">-${order.discount_amount} ج.م</td>
        </tr>`;
    }

    // 5. روابط السوشيال ميديا
    let socialIcons = '';
    if(facebook) socialIcons += `<a href="${facebook}" style="text-decoration:none; margin:0 5px;"><img src="https://cdn-icons-png.flaticon.com/32/145/145802.png" width="24" style="filter: invert(1);"></a>`;
    if(instagram) socialIcons += `<a href="${instagram}" style="text-decoration:none; margin:0 5px;"><img src="https://cdn-icons-png.flaticon.com/32/3955/3955024.png" width="24" style="filter: invert(1);"></a>`;
    if(whatsapp) socialIcons += `<a href="${waLink}" style="text-decoration:none; margin:0 5px;"><img src="https://cdn-icons-png.flaticon.com/32/3670/3670051.png" width="24" style="filter: invert(1);"></a>`;

    // حساب رابط لوحة التحكم للأدمن
    let adminUrl = siteUrl;
    if (adminUrl && adminUrl.includes('index.html')) {
        adminUrl = adminUrl.replace('index.html', 'admin.html');
    } else {
        adminUrl = adminUrl.endsWith('/') ? adminUrl + 'admin.html' : adminUrl + '/admin.html';
    }

    // ==========================================
    // 🎨 تصميم القالب (HTML Email Template) - نفس التصميم الفخم
    // ==========================================
    const htmlTemplate = (isForAdmin) => `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body { margin: 0; padding: 0; background-color: #121212; font-family: 'Cairo', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background-color: #1e1e1e; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
            .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center; border-bottom: 3px solid #FFD700; }
            .content { padding: 30px 20px; color: #ffffff; }
            .info-box { background-color: #252525; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #333; }
            .price-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .price-table td { padding: 8px 0; color: #b0b0b0; }
            .total-row td { border-top: 1px solid #444; padding-top: 15px; color: #FFD700; font-size: 18px; font-weight: bold; }
            .btn { display: inline-block; background-color: #FFD700; color: #000000; padding: 12px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; margin-top: 20px; transition: 0.3s; }
            .footer { background-color: #000000; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333; }
            a { color: #FFD700; text-decoration: none; }
        </style>
    </head>
    <body style="background-color: #121212; margin: 0; padding: 20px;">
        
        <div class="container">
            <div class="header">
                <a href="${siteUrl}" target="_blank">
                    ${logoUrl ? `<img src="${logoUrl}" alt="${siteName}" width="100" style="border-radius: 12px; margin-bottom: 15px;">` : ''}
                </a>
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">${siteName}</h1>
                <p style="margin: 5px 0 0; color: #FFD700; font-size: 14px;">
                    ${isForAdmin ? '🔔 إشعار طلب جديد' : '🎉 تم استلام طلبك بنجاح'}
                </p>
            </div>

            <div class="content">
                <p style="text-align: center; font-size: 16px; margin-bottom: 30px;">
                    مرحباً <strong>${order.customer_name}</strong>،<br>
                    ${isForAdmin ? 'قام هذا العميل بإتمام طلب جديد، التفاصيل أدناه:' : 'شكراً لثقتك بنا! هذه تفاصيل طلبك، سنقوم بمراجعته والبدء في تجهيزه فوراً.'}
                </p>

                <div class="info-box">
                    <table width="100%">
                        <tr>
                            <td style="color: #888; font-size: 12px;">رقم الطلب</td>
                            <td style="color: #888; font-size: 12px; text-align: left;">التاريخ</td>
                        </tr>
                        <tr>
                            <td style="color: #fff; font-size: 16px; font-weight: bold; font-family: monospace;">#${order.order_id}</td>
                            <td style="color: #fff; font-size: 14px; text-align: left;">${order.date ? order.date.split(',')[0] : ''}</td>
                        </tr>
                    </table>
                </div>

                <div class="info-box">
                    <h3 style="margin: 0 0 15px; color: #FFD700; font-size: 16px; border-bottom: 1px solid #444; padding-bottom: 10px;">📦 المنتجات المطلوبة</h3>
                    <table width="100%" cellspacing="0">
                        ${itemsHtml}
                    </table>
                </div>

                <div class="info-box">
                    <h3 style="margin: 0 0 15px; color: #FFD700; font-size: 16px; border-bottom: 1px solid #444; padding-bottom: 10px;">💰 ملخص الدفع</h3>
                    <table class="price-table">
                        <tr>
                            <td>مجموع الكتب</td>
                            <td style="text-align: left;">${order.books_price} ج.م</td>
                        </tr>
                        <tr>
                            <td>مصاريف الشحن <small style="color:#666;">(${order.governorate})</small></td>
                            <td style="text-align: left;">${order.shipping_cost} ج.م</td>
                        </tr>
                        ${discountRow}
                        <tr class="total-row">
                            <td>الإجمالي النهائي</td>
                            <td style="text-align: left;">${order.total_price} ج.م</td>
                        </tr>
                    </table>
                </div>

                <div class="info-box">
                    <h3 style="margin: 0 0 15px; color: #FFD700; font-size: 16px; border-bottom: 1px solid #444; padding-bottom: 10px;">📍 عنوان التوصيل</h3>
                    <p style="margin: 5px 0; color: #e0e0e0; font-size: 14px;"><strong>العنوان:</strong> ${order.address}</p>
                    <p style="margin: 5px 0; color: #e0e0e0; font-size: 14px;"><strong>الهاتف:</strong> ${order.phone}</p>
                    ${order.notes ? `<p style="margin: 5px 0; color: #aaa; font-size: 13px;"><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${isForAdmin ? adminUrl : siteUrl}?orderId=${order.order_id}" class="btn" style="color:#000 !important;">
                        ${isForAdmin ? 'عرض في لوحة التحكم' : 'تتبع حالة الطلب'}
                    </a>
                </div>

                ${!isForAdmin ? `
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #333;">
                    <p style="color: #888; font-size: 13px; margin-bottom: 10px;">تحتاج مساعدة؟ تواصل معنا</p>
                    <div>${socialIcons}</div>
                </div>
                ` : ''}
            </div>

            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${siteName}. جميع الحقوق محفوظة.</p>
                <p style="opacity: 0.5; margin-top: 10px;">
                    Developed by <a href="https://ahmed-attia-portfolio-git-main-ahm3d0xs-projects.vercel.app/" target="_blank" style="color: #888; text-decoration: underline;">Ahmed M Attia</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    // 6. إرسال الإيميلات
    
    // إرسال للعميل
    if(order.email && order.email.includes('@')) {
        MailApp.sendEmail({ 
            to: order.email, 
            subject: `✅ تم استلام طلبك ${order.order_id} - ${siteName}`, 
            htmlBody: htmlTemplate(false) 
        });
    }

    // إرسال للأدمن (سيستخدم الإيميل الذي جلبناه من خانة contact_email)
    if(adminEmail && adminEmail.includes('@')) {
        MailApp.sendEmail({ 
            to: adminEmail, 
            subject: `🔔 طلب جديد: ${order.order_id} (${order.total_price} ج.م)`, 
            htmlBody: htmlTemplate(true) 
        });
    }
}
// دالة مساعدة لضبط روابط الصور
function getEmailImageUrl(url) {
    if (!url) return '';
    let id = '';
    const part1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (part1 && part1[1]) id = part1[1];
    else {
        const part2 = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (part2 && part2[1]) id = part2[1];
    }
    if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    return url;
}
function authorizeEmail() {
  MailApp.getRemainingDailyQuota();
  console.log("تمت الموافقة بنجاح!");
}
// دالة مساعدة لضبط روابط الصور
function getEmailImageUrl(url) {
    if (!url) return '';
    let id = '';
    const part1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (part1 && part1[1]) id = part1[1];
    else {
        const part2 = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (part2 && part2[1]) id = part2[1];
    }
    if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    return url;
}
function authorizeEmail() {
  MailApp.getRemainingDailyQuota();
  console.log("تمت الموافقة بنجاح!");
}