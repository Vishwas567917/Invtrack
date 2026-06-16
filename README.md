# InvTrack - Full-Stack Setup Guide

## 🚀 Project Overview

**InvTrack** is a production-ready inventory management system with:
- **Backend**: Flask + SQLite database
- **Frontend**: HTML/CSS/JS with Google Maps API
- **Features**: Smart shopping list, multi-shop finder, real-time inventory, pre-order system

---

## 📋 Prerequisites

- **Python 3.8+** installed
- **pip** (Python package manager)
- **Google Maps API Key** (Get from https://cloud.google.com/maps-platform)
- **Git** (optional, for version control)

---

## 🛠️ Installation Steps

### Step 1: Create a Project Directory

```bash
mkdir invtrack-app
cd invtrack-app
```

### Step 2: Create Virtual Environment (Recommended)

```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Get Google Maps API Key

1. Go to https://cloud.google.com/maps-platform
2. Enable these APIs:
   - Google Maps Platform
   - Maps JavaScript API
   - Maps Distance Matrix API
3. Create an API Key
4. Copy the API key

### Step 5: Update Google Maps API Key

Edit `index.html` and replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual key:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=places,geometry"></script>
```

### Step 6: Run the Backend

```bash
python app.py
```

You should see:
```
Database initialized with sample data!
Running on http://127.0.0.1:5000
```

### Step 7: Open Frontend

Open `index.html` in your web browser:
- On Windows: Double-click `index.html`
- Or open http://localhost:5000 if serving through Flask

---

## 🔐 Demo Accounts

### Customer Account
- **Email**: customer@test.com
- **Password**: test123

### Shopkeeper Account
- **Email**: shop@test.com
- **Password**: test123

### Admin Account (Login Only)
- **Email**: admin@invtrack.com
- **Password**: Admin@123

---

## 📁 Project Structure

```
invtrack-app/
├── app.py                 # Flask backend
├── index.html            # Frontend
├── requirements.txt       # Python dependencies
├── invtrack.db           # SQLite database (auto-created)
└── SETUP_GUIDE.md        # This file
```

---

## 🗄️ Database Schema

### Users Table
- id, email, password, name, role (customer/shopkeeper/admin), is_verified

### Shops Table
- id, name, owner_id, city, address, latitude, longitude, rating, phone

### Products Table
- id, shop_id, name, category, price, quantity, description

### Orders Table
- id, customer_id, shop_id, total_amount, status, payment_status, created_at

### OrderItems Table
- id, order_id, product_id, quantity, price

---

## 🎯 Feature Guide

### For Customers

1. **View Nearby Shops**
   - Login with customer account
   - Allows geolocation to find shops near you
   - Map view with all shop locations

2. **Smart Shopping List**
   - Add items you need
   - System finds nearest shop(s) with all items
   - Expands to 2-3 shops if needed
   - Shows optimal shopping route

3. **Pre-Order & Payment**
   - Select shop and items
   - Online payment (simulated)
   - Stock automatically deducts from inventory
   - Track order status

### For Shopkeepers

1. **Dashboard**
   - Real-time stats (products, orders, revenue, low stock)
   - Today's orders and revenue

2. **Inventory Management**
   - Add/edit/delete products
   - Real-time stock updates
   - Track low stock items

3. **Order Management**
   - View customer orders
   - Update order status
   - Mark as delivered
   - Stock deducts automatically when order is confirmed

### For Admins

1. **System Dashboard**
   - Total users, shops, orders, revenue

2. **User Management**
   - View all users
   - Delete users if needed
   - Role-based filtering

3. **Security Settings**
   - Verify admin accounts (login-only)
   - No public admin signup
   - System auto-generates admin credentials

---

## 🔍 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Customer
- `GET /api/shops` - Get all shops (with distance)
- `GET /api/shops/<id>/products` - Get shop products
- `POST /api/shopping-list/find-shops` - Find optimal shops
- `POST /api/orders/pre-order` - Create pre-order
- `GET /api/orders` - Get user's orders

### Shopkeeper
- `GET /api/shopkeeper/products` - Get shop products
- `POST /api/shopkeeper/products` - Add product
- `PUT /api/shopkeeper/products/<id>` - Update product
- `DELETE /api/shopkeeper/products/<id>` - Delete product
- `GET /api/shopkeeper/orders` - Get shop's orders
- `PUT /api/shopkeeper/orders/<id>` - Update order status
- `GET /api/shopkeeper/dashboard` - Get dashboard stats

### Admin
- `GET /api/admin/users` - Get all users
- `DELETE /api/admin/users/<id>` - Delete user
- `POST /api/admin/admins/verify` - Verify admin
- `GET /api/admin/dashboard` - Get admin stats

---

## 🧪 Testing Workflow

### Test as Customer:
1. Login with customer@test.com
2. Click "Shops" to see nearby stores
3. Click "Shopping List"
4. Add items: Apple (2), Banana (5)
5. Click "Find Shops"
6. Select a shop and order

### Test as Shopkeeper:
1. Login with shop@test.com
2. Go to Dashboard (see stats)
3. Go to Inventory, add new product
4. Go to Orders, see customer orders
5. Mark orders as delivered

### Test as Admin:
1. Login with admin@invtrack.com
2. Go to Dashboard (see system stats)
3. Go to Users (view/delete users)
4. Go to Security (verify new admins)

---

## 🐛 Troubleshooting

### "Connection Refused" Error
- Make sure Flask is running: `python app.py`
- Check if port 5000 is available

### "Google Maps Not Loading"
- Verify your API key is correct
- Check if Maps API is enabled in Google Cloud

### "Database Already Exists"
- Delete `invtrack.db` file and run `python app.py` again

### CORS Errors
- Flask-CORS is already configured
- Make sure API calls use `credentials: 'include'`

---

## 🔐 Security Features

✅ **Role-Based Access Control (RBAC)**
- Customer: Can only view shops and place orders
- Shopkeeper: Can only manage own shop
- Admin: Full system access

✅ **Admin Account Security**
- Public signup disabled for admins
- Only verified admins can access
- Login-only (no self-signup)

✅ **Data Validation**
- Email uniqueness checks
- Stock quantity validation
- Payment status tracking

✅ **Session Management**
- Secure password hashing (Werkzeug)
- Session-based authentication
- Logout functionality

---

## 📈 Future Enhancements

- [ ] Real payment gateway (Razorpay/Stripe)
- [ ] Email notifications
- [ ] SMS alerts for low stock
- [ ] Advanced analytics & reports
- [ ] Mobile app (React Native)
- [ ] Real-time notifications (WebSocket)
- [ ] Product reviews & ratings
- [ ] Delivery tracking

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check Flask console for error messages
4. Look at browser console for frontend errors

---

## 📝 License

This project is for educational purposes.

---

**Created with ❤️ for inventory management**