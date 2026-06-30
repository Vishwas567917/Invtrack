# InvTrack

## 🚀 Project Overview

InvTrack is an inventory management system built with:

- **Backend:** Flask + SQLAlchemy with SQLite
- **Frontend:** HTML/JavaScript modules for authentication, customer shopping, shopkeeper inventory, and admin dashboards
- **Location Support:** MapLibre/OpenStreetMap for map rendering and geocoding via Nominatim
- **Roles:** customer, shopkeeper, admin

---

## 📋 Prerequisites

- Python 3.8+ installed
- pip available in your Python environment
- Git (optional)

---

## 🛠️ Setup and Run

### 1. Start in the project root

```powershell
cd "c:\Users\USER\OneDrive\Documents\GitHub\Invtrack"
```

### 2. Set up the backend environment

```powershell
cd backend
..\scripts\install.ps1
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Run the backend server

```powershell
python App.py
```

By default, the backend starts at:

```
http://127.0.0.1:5000
```

The first run creates the SQLite database and seeds sample data automatically.

### 4. Open the frontend

Open this file in your browser:

- `frontend/auth/auth.html`

Then log in as one of the sample users or register a new account.

> If you prefer a local web server, run from the `frontend` folder:
>
> ```powershell
> cd ..\frontend
> python -m http.server 8000
> ```
>
> and open `http://127.0.0.1:8000/auth/auth.html`

---

## 👤 Default Accounts

- Admin: `admin@invtrack.com` / `Admin@123`
- Customer: `customer@test.com` / `test123`
- Shopkeeper: `shop@test.com` / `test123`

---

## 🧩 Application Flow

### Customer

- Browse nearby shops
- View products for a shop
- Build a shopping list
- Calculate optimal shop routing
- Place orders
- View order history

### Shopkeeper

- View dashboard summary
- Manage inventory products
- Delete products
- View incoming orders
- Mark orders delivered

### Admin

- View platform metrics
- Browse all users
- Manage users

---

## 🔧 Backend Notes

- `backend/App.py` loads optional environment variables from `.env` using `python-dotenv`
- Default database URI: `sqlite:///invtrack.db`
- Default secret key: `fallback-secret-key-123`
- API prefix: `http://127.0.0.1:5000/api`

---

## 📁 Project Structure

- `backend/`
  - `App.py` — Flask application entry point
  - `models.py` — SQLAlchemy models
  - `routes/` — API route blueprints for auth, customer, shopkeeper, admin
  - `helpers.py` — route optimization and distance helpers
  - `requirements.txt` — backend dependencies
- `frontend/`
  - `auth/` — login and signup pages
  - `customer/` — customer dashboard and shopping flows
  - `shopkeeper/` — shopkeeper inventory dashboard
  - `admin/` — admin monitoring dashboard
  - `shared/` — shared API helper functions

---

## ✅ Notes

- The frontend uses MapLibre and OpenStreetMap, so no Google Maps API key is required.
- If you add a `.env` file in `backend/`, you can override `SECRET_KEY` and `DATABASE_URI`.
- Run the backend before opening frontend pages so the UI can connect to the API.
