# InvTrack - Full-Stack Setup Guide

## 🚀 Project Overview

**InvTrack** is a production-ready inventory management system with:

- **Backend**: Flask + SQLAlchemy (SQLite) modularized structure
- **Frontend**: Single-page architecture with dynamic DOM routing and Google Maps integration
- **Features**: Smart shopping list multi-shop finder, real-time inventory tracking, and automatic order fulfillment

---

## 📋 Prerequisites

- **Python 3.8+** installed
- **pip** (Python package manager)
- **Google Maps API Key** (Obtained from the Google Cloud Console)
- **Git** (optional, for version control)

---

## 🛠️ Installation Steps

### Step 1: Create a Project Directory

```bash
mkdir backend
cd backend
```

### Step 2: Create Virtual Environment (Recommended)

```powershell
../scripts/install.ps1
.\venv\Scripts\Activate.ps1
```

### Step 3: Update Google Maps API Key

Edit `index.html` and replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual key:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=places,geometry"></script>
```

### Step 4: Run the Backend

```
python app.py
```

You should see:
Database initialized with sample data!
Running on [http://127.0.0.1:5000](http://127.0.0.1:5000)

### Step 5: Open Frontend

Open `index.html` directly in your web browser, or serve it using a local development server or your preferred tooling.

### 🔐 Security Features

- **Role-Based Access Control (RBAC):** Enforced via route blueprints. Customers, shopkeepers, and admins are constrained to their respective logical spaces.

- **Cascade Protections:** Cascade rules (all, delete-orphan) are configured at the database level. Deleting parent orders or items automatically and cleanly handles child associations.

- **Transactional Consistency:** Database models snapshot product prices at the moment of checkout, maintaining precise record history despite subsequent inventory shifts.
