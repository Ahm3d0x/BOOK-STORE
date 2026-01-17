/**
 * 🚀 Ultimate E-commerce Backend v5.0 (Full Features)
 * Developed for Book.com
 */

const SCRIPT_PROP = PropertiesService.getScriptProperties();

// ==========================================
// 1. معالجة طلبات القراءة (GET)
// ==========================================
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 

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
         
      case 'getCoupons': // خاص بلوحة التحكم
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
  } finally {
    lock.releaseLock();
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
         for (const [k, v] of Object.entries(requestData)) { if(k !== 'action') newSettingsRows.push([k, v]); }
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
  const newRow = headers.map(header => (dataObj[header] !== undefined && dataObj[header] !== null) ? dataObj[header] : '');
  sheet.appendRow(newRow);
}

function updateRowDynamic(sheet, idColName, idValue, dataObj) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColName);
  if (idIdx === -1) return;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(idValue)) {
      headers.forEach((header, colIdx) => {
        if (dataObj.hasOwnProperty(header)) sheet.getRange(i + 1, colIdx + 1).setValue(dataObj[header]);
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

// ==========================================
// 4. نظام الإيميلات الاحترافي (Fixed)
// ==========================================
function sendEmails(order, settingsSheet) {
    // 1. جلب إعدادات الموقع من الشيت
    let siteName = 'Book.com';
    let adminEmail = '';
    let siteLogoRaw = '';
    
    // متغيرات التواصل
    let whatsapp = '';
    let facebook = '';
    let contactEmail = ''; 
    
    try {
        const settings = getData(settingsSheet);
        settings.forEach(s => { 
            if(s.key === 'site_name') siteName = s.value;
            if(s.key === 'site_logo') siteLogoRaw = s.value;
            if(s.key === 'whatsapp') whatsapp = s.value;
            if(s.key === 'facebook') facebook = s.value;
            if(s.key === 'contact_email') contactEmail = s.value;
        });
        // جلب إيميل الأدمن
        adminEmail = settingsSheet.getRange(4, 2).getValue();
    } catch(e) {
        Logger.log("Error fetching settings: " + e);
    }

    // 2. معالجة رابط اللوجو
    const logoUrl = getEmailImageUrl(siteLogoRaw);
    const logoHtml = logoUrl 
        ? `<img src="${logoUrl}" alt="${siteName}" style="max-height: 80px; display: block; margin: 0 auto 10px auto; border-radius: 8px;">` 
        : `<div style="font-size: 24px; font-weight: bold; color: #FFD700; text-align: center;">${siteName}</div>`;

    // 3. تجهيز سطر الخصم
    let discountRow = '';
    if (Number(order.discount_amount) > 0) {
        discountRow = `
        <tr style="background-color: #e8f5e9;">
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #2e7d32;">
                <strong>قيمة الخصم</strong> <span style="font-size: 11px; background: #c8e6c9; padding: 2px 6px; border-radius: 4px; margin-right: 5px;">${order.coupon_code}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left; font-weight: bold; color: #2e7d32;">-${order.discount_amount} ج.م</td>
        </tr>`;
    }

    // 4. تجهيز قسم معلومات التواصل (التصحيح هنا: حذفنا الشرط الخاطئ)
    const contactSection = `
    <div style="margin-top: 30px; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px dashed #ccc; text-align: right;">
        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px; border-bottom: 2px solid #FFD700; display: inline-block; padding-bottom: 5px;">📞 خدمة العملاء</h3>
        <p style="margin: 5px 0; color: #666; font-size: 13px;">لأي استفسار بخصوص طلبك، يمكنك التواصل معنا عبر:</p>
        
        <ul style="list-style: none; padding: 0; margin: 10px 0;">
            ${whatsapp ? `<li style="margin-bottom: 8px;"><strong>📱 واتساب:</strong> ${whatsapp}</li>` : ''}
            ${contactEmail ? `<li style="margin-bottom: 8px;"><strong>📧 البريد الإلكتروني:</strong> ${contactEmail}</li>` : ''}
            ${facebook ? `<li style="margin-bottom: 8px;"><strong>🌐 فيسبوك:</strong> <a href="${facebook}" target="_blank" style="color: #007bff; text-decoration: none;">زيارة صفحتنا</a></li>` : ''}
        </ul>
    </div>
    `;

    // 5. قالب الإيميل
    const htmlTemplate = (isForAdmin) => `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #1a1a1a; color: #333; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
          .header { background-color: #000000; color: #fff; padding: 30px 20px; text-align: center; border-bottom: 4px solid #FFD700; }
          .content { padding: 30px 20px; }
          .invoice-box { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
          .invoice-box td { padding: 12px; border-bottom: 1px solid #eee; }
          .total-row { background-color: #000; color: #fff; font-size: 16px; }
          .footer { background-color: #111; padding: 20px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #333; }
          .footer a { color: #FFD700; text-decoration: none; }
          .dev-credit { margin-top: 10px; font-size: 11px; opacity: 0.7; }
          .admin-alert { background: #ffebee; color: #c62828; padding: 10px; text-align: center; font-weight: bold; margin-bottom: 15px; border-radius: 4px; border: 1px solid #ffcdd2; }
        </style>
      </head>
      <body>
         <div class="container">
             <div class="header">
                 ${logoHtml}
                 <h1 style="margin: 10px 0 0 0; font-size: 22px; color: #FFD700;">${siteName}</h1>
                 <p style="margin: 5px 0 0; opacity: 0.8; font-size: 12px;">تأكيد تفاصيل الطلب #${order.order_id}</p>
             </div>
             
             <div class="content">
                 ${isForAdmin ? '<div class="admin-alert">🔔 تنبيه: طلب جديد من الموقع</div>' : ''}
                 
                 <p>مرحباً <strong>${order.customer_name}</strong>،</p>
                 <p>شكراً لثقتك بنا! ${isForAdmin ? 'تفاصيل الطلب الجديد:' : 'تم استلام طلبك بنجاح، وفيما يلي التفاصيل:'}</p>
                 
                 <table class="invoice-box">
                    <thead>
                        <tr style="background-color: #f8f8f8; text-align: right; color: #555;">
                            <th style="padding: 10px;">البيان</th>
                            <th style="padding: 10px; text-align: left;">القيمة</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>مجموع الكتب</td>
                            <td style="text-align: left;">${order.books_price} ج.م</td>
                        </tr>
                        <tr>
                            <td>مصاريف الشحن <small style="color: #777;">(${order.governorate})</small></td>
                            <td style="text-align: left;">${order.shipping_cost} ج.م</td>
                        </tr>
                        ${discountRow}
                        <tr class="total-row">
                            <td style="font-weight: bold; border-top: 2px solid #FFD700;">الإجمالي النهائي</td>
                            <td style="text-align: left; font-weight: bold; color: #FFD700; border-top: 2px solid #FFD700;">${order.total_price} ج.م</td>
                        </tr>
                    </tbody>
                 </table>

                 <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #eee; font-size: 13px; line-height: 1.6;">
                    <div style="color: #FFD700; font-weight: bold; font-size: 14px; margin-bottom: 5px; background: #000; display: inline-block; padding: 2px 8px; border-radius: 4px;">📦 بيانات الشحن</div>
                    <div><strong>العنوان:</strong> ${order.address}</div>
                    <div><strong>رقم الهاتف:</strong> ${order.phone}</div>
                    <div style="margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 5px;">
                        <strong>المنتجات:</strong><br> ${order.items.split('|').join('<br>')}
                    </div>
                 </div>
                 
                 ${!isForAdmin ? contactSection : ''}

             </div>

             <div class="footer">
                 &copy; ${new Date().getFullYear()} ${siteName}. جميع الحقوق محفوظة.<br>
                 <div class="dev-credit">
                     Developed by <a href="https://ahmed-attia-portfolio-git-main-ahm3d0xs-projects.vercel.app/" target="_blank">Ahmed M Attia</a>
                 </div>
             </div>
         </div>
      </body>
      </html>
    `;

    // 6. إرسال الإيميلات
    if(order.email && order.email.includes('@')) {
        MailApp.sendEmail({ 
            to: order.email, 
            subject: `✅ تم استلام طلبك ${order.order_id} - ${siteName}`, 
            htmlBody: htmlTemplate(false) 
        });
    }

    if(adminEmail && adminEmail.includes('@')) {
        MailApp.sendEmail({ 
            to: adminEmail, 
            subject: `🔔 طلب جديد: ${order.order_id} (${order.total_price} ج.م)`, 
            htmlBody: htmlTemplate(true) 
        });
    }
}

// دالة مساعدة
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