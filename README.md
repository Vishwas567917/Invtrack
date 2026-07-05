# InvTrack

InvTrack is a modern inventory and order-management platform designed to make shopping and shop management simpler, faster, and more intelligent. It brings together customers, shopkeepers, and administrators in one connected system so that product availability, orders, and store operations can be handled with less effort and greater clarity.

---

## Why This Project Exists

Many small shops still rely on manual processes for tracking inventory, managing customer orders, and coordinating deliveries. This often leads to:

- missed stock updates
- confusion around order status
- inefficient shopping decisions for customers
- limited visibility for store owners and admins

InvTrack was created to solve these issues by offering a simple digital workflow where users can browse shops, check product availability, place orders, manage inventory, and monitor activity from one place.

---

## What InvTrack Does

InvTrack is built to support three main user groups:

- Customers can discover nearby shops, view products, and place orders.
- Shopkeepers can manage their stock, update product details, and process incoming orders.
- Administrators can oversee the platform, manage users, and monitor system activity.

The platform combines inventory control with location-aware shopping support, making it especially useful for local retail environments.

---

## Key Features

### For Customers
- Browse available shops
- View products and prices
- Check product availability
- Place orders easily
- Review order history
- Find better shopping options using location-based logic

### For Shopkeepers
- Manage inventory items
- Add or remove products
- Track incoming orders
- Update delivery and order status
- Keep store operations organized

### For Admins
- Monitor platform activity
- Manage users
- Review overall system usage
- Maintain control over the application ecosystem

---

## How It Works

InvTrack follows a simple flow:

1. A user signs in or registers.
2. The system identifies the user role as customer, shopkeeper, or admin.
3. Customers can browse shops and products, then place orders.
4. Shopkeepers receive and manage those orders through their dashboard.
5. Admins oversee the broader system and user activity.

The backend handles authentication, inventory data, order processing, and role-based access, while the frontend provides a role-specific experience for each type of user.

---

## Tech Stack

- Backend: Flask
- Database: SQLAlchemy with SQLite
- Authentication: secure password hashing and role-based access
- Frontend: HTML, CSS, and JavaScript-based role pages
- Mapping support: OpenStreetMap and MapLibre-style location features

This combination keeps the system lightweight, easy to understand, and suitable for a practical inventory-management project.

---

## Project Structure

- backend/ - Flask application, database models, API routes, and business logic
- frontend/ - user-facing pages for authentication, customer flow, shopkeeper flow, and admin flow
- scripts/ - setup helpers

---

## Getting Started

### Prerequisites
- Python 3.8+
- pip
- Git (optional)

### Backend Setup
```bash
cd "c:\Users\USER\OneDrive\Documents\GitHub\Invtrack"
python -m venv venv
./venv/Scripts/Activate.ps1
pip install -r backend/requirements.txt
```

### Run the Server
```bash
cd backend
python App.py
```

The backend will start locally and initialize the database on first run.

---

## Default Demo Accounts

- Admin: admin@invtrack.com / Admin@123
- Customer: customer@test.com / test123
- Shopkeeper: shop@test.com / test123

---

## Why This Matters

InvTrack is more than just an inventory app. It is a practical example of how digital tools can improve everyday retail operations by making stock management, ordering, and coordination easier for everyone involved.

It is especially valuable for:
- small businesses wanting a simple digital system
- students building a full-stack project with real-world functionality
- developers exploring role-based applications and inventory workflows

---

## Summary

InvTrack aims to create a cleaner and smarter way to connect customers, shops, and administration in a single platform. It is designed to be useful, approachable, and extensible for future improvements such as payments, notifications, analytics, and advanced inventory forecasting.
