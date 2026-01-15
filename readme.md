# Book.com - Serverless Online Bookstore

A modern, full-featured online bookstore application built with a **Serverless** architecture. It uses **Google Sheets** as a database and **Google Apps Script** as a backend API, with a responsive frontend built using HTML, Tailwind CSS, and Vanilla JavaScript.

The application features a "Glassmorphism" UI design, a comprehensive admin dashboard, real-time stock management, and an order tracking system.

## 🌟 Features

### 🛍️ Client Side (User Experience)
* **Dynamic Homepage:** Features an auto-playing stack slider and "New Arrivals" section.
* **Library Gallery:** Filter books by Category, Release Year, and Age Rating. Includes live search.
* **Cart System:** LocalStorage-based shopping cart with instant total calculation and stock validation.
* **Book Details:** Modal view with blurred background, detailed descriptions, tags, and "Add to Cart" functionality.
* **Order Tracking:** Users can track their order status (New, Preparing, Shipped, Delivered) using their Order ID.
* **Checkout:** Cash-on-delivery system with form validation. Automatically checks stock levels before confirming orders.
* **Responsive Design:** Fully optimized for mobile and desktop with a custom mobile menu.

### 🛡️ Admin Dashboard (`admin.html`)
* **Secure Login:** Authentication system (credentials stored in Google Sheets).
* **Inventory Management:** Add, Edit, and Delete books. Updates reflect immediately on the site.
* **Order Management:** View order details, customer info, and change order status (which updates the tracking dates automatically).
* **Slider Control:** Add or remove promotional slides from the homepage.
* **Site Settings:** Change the Site Name, Logo, Social Links, and Privacy Policy text directly from the admin panel without touching code.

### ⚙️ Backend (Google Apps Script)
* **Automated Emails:** Sends HTML email confirmations to the customer and detailed reports to the admin upon new orders.
* **Stock Management:** Automatically deducts stock when an order is placed. Marks books as "Unavailable" if stock hits zero.
* **API Endpoints:** Handles both `GET` (fetching data) and `POST` (updating data) requests.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+).
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (CDN) + Custom `style.css` for Glassmorphism effects.
* **Icons:** [FontAwesome](https://fontawesome.com/).
* **Backend:** Google Apps Script (GAS).
* **Database:** Google Sheets.

---

## 🚀 Installation & Setup

Follow these steps to deploy the project for free.

### Step 1: Google Sheet Setup
1.  Create a new **Google Sheet**.
2.  Create 4 Tabs (Sheets) named exactly: `Books`, `Orders`, `Settings`, `Slider`.
3.  **Add Header Rows (Row 1)** in each tab as follows:

    * **Books:**
        `id`, `title`, `author`, `category`, `price`, `discount`, `stock`, `status`, `image_url`, `description`, `tags`, `release_date`, `age_rating`, `date_added`
    
    * **Orders:**
        `order_id`, `date`, `customer_name`, `phone`, `email`, `address`, `items`, `total_price`, `status`, `notes`, `date_preparing`, `date_shipped`, `date_delivered`, `date_cancelled`

    * **Settings:**
        * *Columns:* `key`, `value`
        * *Initial Data:* Add a row with `user` in col A and your admin username in col B. Add another with `password` in col A and your password in col B.
        * **Important:** In `Row 4, Column 2`, put the Admin Email address (for receiving order notifications).

    * **Slider:**
        `id`, `title`, `subtitle`, `image_url`, `link`, `active`

### Step 2: Google Apps Script (Backend)
1.  In your Google Sheet, go to `Extensions` > `Apps Script`.
2.  Clear the default code.
3.  Copy the content of **`data.txt`** and paste it into the editor.
4.  **Important:** If you want to hardcode the Sheet ID, paste it into `const SHEET_ID = '';` at the top. Otherwise, keep it empty to use the active sheet.
5.  Save the project.
6.  Click **Deploy** > **New Deployment**.
    * **Select type:** Web app.
    * **Description:** "v1".
    * **Execute as:** Me (your email).
    * **Who has access:** **Anyone** (This is crucial for the frontend to access the DB).
7.  Click **Deploy** and copy the **Web App URL**.

### Step 3: Frontend Connection
1.  Open **`index.js`**.
2.  Locate `const API_URL = '...'` at the top.
3.  Replace the URL with your **Web App URL** from Step 2.
4.  Open **`admin.js`**.
5.  Replace `const API_URL` there as well.

### Step 4: Run
1.  Host the files (`index.html`, `admin.html`, `style.css`, `js files`) on any static host (GitHub Pages, Vercel, Netlify) or open `index.html` locally.
2.  **Default Admin Login:** If you didn't set it in the sheet, default is User: `admin`, Pass: `123456`.

---

## 📂 Project Structure

```text
├── index.html       # Main Storefront
├── admin.html       # Admin Control Panel
├── style.css        # Custom styles & Glassmorphism theme
├── index.js         # Client-side logic (Cart, API, UI)
├── admin.js         # Admin-side logic (Auth, CRUD, Dashboard)
└── data.txt         # Google Apps Script Code (Server-side)