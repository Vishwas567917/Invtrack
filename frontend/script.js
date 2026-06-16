const API_BASE = "http://localhost:5000/api";
let currentUser = null;
let map = null;
let shoppingListItems = [];

// Cache to safely pass dynamic complex objects to onclick events
window.shopItemsCache = {};

// Auto-login if session persists
window.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      showApp();
    } catch (e) {
      localStorage.removeItem("currentUser");
    }
  }
});

// ===== AUTH FUNCTIONS =====
function switchTab(tab) {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (tab === "login") {
    loginForm.style.display = "block";
    signupForm.style.display = "none";
  } else {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
  }

  // Clear active tab indicators safely across explicit contexts
  document
    .querySelectorAll(".auth-tab")
    .forEach((t) => t.classList.remove("active"));

  // Explicitly query active structural tab target states
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach((button) => {
    if (tab === "login" && button.getAttribute("onclick").includes("login")) {
      button.classList.add("active");
    } else if (
      tab === "signup" &&
      button.getAttribute("onclick").includes("signup")
    ) {
      button.classList.add("active");
    }
  });
}

function selectRole(btn, role) {
  document
    .querySelectorAll(".role-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  const shopFields = document.getElementById("shopkeeperFields");
  if (role === "shopkeeper") {
    shopFields.style.display = "block";
  } else {
    shopFields.style.display = "none";
  }
}

async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || "Login failed", "danger");
      return;
    }

    currentUser = data.user;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    showApp();
  } catch (error) {
    showAlert("Connection error", "danger");
  }
}

async function handleSignup() {
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const activeRoleBtn = document.querySelector(".role-btn.active");
  const role = activeRoleBtn
    ? activeRoleBtn.textContent.trim().toLowerCase()
    : "customer";

  let body = { name, email, password, role };

  if (role === "shopkeeper") {
    body = {
      ...body,
      shop_name: document.getElementById("storeName").value,
      city: document.getElementById("storeCity").value,
      address: document.getElementById("storeAddress").value,
      phone: document.getElementById("storePhone").value,
      latitude: parseFloat(document.getElementById("storeLat").value || 0),
      longitude: parseFloat(document.getElementById("storeLon").value || 0),
    };
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || "Signup failed", "danger");
      return;
    }

    currentUser = data.user;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    showAlert("Account created successfully!", "success");
    showApp();
  } catch (error) {
    showAlert("Connection error", "danger");
  }
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  document.getElementById("authPage").className = "page active";
  document.getElementById("mainApp").className = "page";
}

// ===== APP FUNCTIONS =====
function showApp() {
  document.getElementById("authPage").classList.remove("active");
  document.getElementById("mainApp").classList.add("active");
  renderNavBar();
  renderSidebar();
  loadInitialData();
}

function renderNavBar() {
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userRole").textContent =
    currentUser.role.toUpperCase();
}

function renderSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";

  const menus = {
    customer: [
      { icon: "fas fa-store", label: "Shops", section: "shops" },
      { icon: "fas fa-list", label: "Shopping List", section: "shopping-list" },
      { icon: "fas fa-receipt", label: "Orders", section: "orders" },
    ],
    shopkeeper: [
      { icon: "fas fa-chart-bar", label: "Dashboard", section: "dashboard" },
      { icon: "fas fa-boxes", label: "Inventory", section: "inventory" },
      { icon: "fas fa-receipt", label: "Orders", section: "orders-shop" },
    ],
    admin: [
      {
        icon: "fas fa-tachometer-alt",
        label: "Dashboard",
        section: "admin-dashboard",
      },
      { icon: "fas fa-users", label: "Users", section: "users" },
      { icon: "fas fa-lock", label: "Security", section: "security" },
    ],
  };

  const items = menus[currentUser.role] || [];
  items.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = `sidebar-item ${idx === 0 ? "active" : ""}`;
    div.innerHTML = `<i class="${item.icon}"></i> ${item.label}`;
    div.onclick = (e) => showSection(item.section, e);
    sidebar.appendChild(div);
  });
}

function showSection(sectionName, event) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));

  const targetSection = document.getElementById(`section-${sectionName}`);
  if (targetSection) targetSection.classList.add("active");

  document
    .querySelectorAll(".sidebar-item")
    .forEach((item) => item.classList.remove("active"));

  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }

  // Contextual live loading on structural section switches
  if (sectionName === "orders" && currentUser.role === "customer") {
    loadCustomerOrders();
  }
}

async function loadInitialData() {
  if (currentUser.role === "customer") {
    await loadShops();
  } else if (currentUser.role === "shopkeeper") {
    await loadDashboard();
  } else if (currentUser.role === "admin") {
    await loadAdminDashboard();
  }
}

// ===== CUSTOMER FUNCTIONS =====
async function loadShops() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        initMap(lat, lon);
        fetchShops(lat, lon);
      },
      (err) => {
        console.error("Geolocation blocked or failed:", err);
        fetchShops(28.6139, 77.209);
      },
    );
  } else {
    fetchShops(28.6139, 77.209);
  }
}

function initMap(lat, lon) {
  const mapElement = document.getElementById("map");
  if (!mapElement || typeof google === "undefined") return;

  mapElement.style.display = "block";
  map = new google.maps.Map(mapElement, {
    zoom: 13,
    center: { lat, lng: lon },
  });

  new google.maps.Marker({
    position: { lat, lng: lon },
    map: map,
    title: "Your Location",
  });
}

async function fetchShops(lat, lon) {
  try {
    const response = await fetch(`${API_BASE}/shops?lat=${lat}&lon=${lon}`);
    const shops = await response.json();

    const container = document.getElementById("shopsContainer");
    container.innerHTML = "";

    shops.forEach((shop) => {
      const card = document.createElement("div");
      card.className = "shop-card";
      card.innerHTML = `
        <div class="shop-name">${shop.name || shop.shop_name}</div>
        <div class="shop-distance">📍 ${(shop.distance || 0).toFixed(1)} km away</div>
        <div style="margin-top: 0.5rem; color: #6b7280; font-size: 12px;">⭐ ${shop.rating || "N/A"}</div>
        <button class="btn btn-primary" onclick="viewShopProducts('${shop.id || shop._id}')" style="margin-top: 1rem; padding: 8px; font-size: 12px;">View Products</button>
      `;
      container.appendChild(card);

      if (map && typeof google !== "undefined") {
        new google.maps.Marker({
          position: {
            lat: parseFloat(shop.latitude),
            lng: parseFloat(shop.longitude),
          },
          map: map,
          title: shop.name || shop.shop_name,
        });
      }
    });
  } catch (error) {
    showAlert("Failed to load shops", "danger");
  }
}

function addShoppingListItem() {
  shoppingListItems.push({
    id: Date.now(),
    name: "",
    quantity: 1,
  });
  renderShoppingList();
}

function renderShoppingList() {
  const container = document.getElementById("shoppingListItems");
  container.innerHTML = "";

  shoppingListItems.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "shopping-list-item";
    div.innerHTML = `
      <input type="text" placeholder="Product name" value="${item.name}" 
          oninput="shoppingListItems[${idx}].name = this.value">
      <input type="number" placeholder="Qty" value="${item.quantity}" min="1"
          oninput="shoppingListItems[${idx}].quantity = parseInt(this.value) || 1">
      <button class="btn btn-danger" onclick="removeShoppingItem(${idx})" style="width: auto; padding: 8px; font-size: 12px;">×</button>
    `;
    container.appendChild(div);
  });
}

function removeShoppingItem(idx) {
  shoppingListItems.splice(idx, 1);
  renderShoppingList();
}

async function findOptimalShops() {
  if (shoppingListItems.length === 0) {
    showAlert("Please add items to your shopping list", "danger");
    return;
  }

  const handleFetch = async (lat, lon) => {
    try {
      const response = await fetch(`${API_BASE}/shopping-list/find-shops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: shoppingListItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
          })),
          latitude: lat,
          longitude: lon,
        }),
      });

      const data = await response.json();
      displaySearchResults(data);
    } catch (error) {
      showAlert("Failed to find shops", "danger");
    }
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => handleFetch(pos.coords.latitude, pos.coords.longitude),
      () => handleFetch(28.6139, 77.209),
    );
  } else {
    handleFetch(28.6139, 77.209);
  }
}

function displaySearchResults(data) {
  const container = document.getElementById("searchResults");
  let html = "<h3>Results:</h3>";

  if (data.complete) {
    html +=
      '<p style="color: var(--success); margin-bottom: 1rem;">✓ All items found!</p>';
  } else {
    const missingNames = data.missing_items
      ? data.missing_items.map((i) => i.name).join(", ")
      : "Some items";
    html += `<p style="color: var(--danger); margin-bottom: 1rem;">Missing items: ${missingNames}</p>`;
  }

  if (data.shops && data.shops.length > 0) {
    data.shops.forEach((shop, index) => {
      const uniqueShopKey = `shop_${shop.id || shop._id}_${index}`;
      window.shopItemsCache[uniqueShopKey] = shop.items;

      html += `
        <div class="card">
            <h4>${shop.name} - ${(shop.distance || 0).toFixed(1)} km away</h4>
            <ul style="margin-left: 1.5rem; margin-top: 1rem; list-style-type: disc;">
                ${shop.items
                  .map(
                    (item) => `
                    <li>${item.name} x${item.quantity_needed || item.quantity} @ ₹${item.price}</li>
                `,
                  )
                  .join("")}
            </ul>
            <button class="btn btn-success" onclick="proceedToCheckout('${shop.id || shop._id}', '${uniqueShopKey}')" 
                style="margin-top: 1rem; width: auto;">Order from ${shop.name}</button>
        </div>
      `;
    });
  } else {
    html += "<p>No matches found in neighboring locations.</p>";
  }

  container.innerHTML = html;
}

async function proceedToCheckout(shopId, cacheKey) {
  const itemsArray = window.shopItemsCache[cacheKey] || [];
  try {
    const response = await fetch(`${API_BASE}/orders/pre-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        shop_id: shopId,
        items: itemsArray.map((item) => ({
          product_id: item.id || item._id,
          quantity: item.quantity_needed || item.quantity,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || "Order failed", "danger");
      return;
    }

    showAlert("Order placed successfully! Payment processed.", "success");
    shoppingListItems = [];
    renderShoppingList();
    document.getElementById("searchResults").innerHTML = "";
  } catch (error) {
    showAlert("Failed to place order", "danger");
  }
}

async function viewShopProducts(shopId) {
  try {
    const response = await fetch(`${API_BASE}/shops/${shopId}/products`);
    const products = await response.json();
    console.log("Shop products:", products);
  } catch (error) {
    showAlert("Failed to load products", "danger");
  }
}

async function loadCustomerOrders() {
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      credentials: "include",
    });
    const orders = await response.json();
    const container = document.getElementById("ordersContainer");

    if (!container) return;
    if (!orders || orders.length === 0) {
      container.innerHTML = "<p>You haven't placed any orders yet.</p>";
      return;
    }

    let html = "";
    orders.forEach((order) => {
      html += `
        <div class="card">
            <h4>Order #${order.id || order._id}</h4>
            <p style="margin: 0.25rem 0; color: #4b5563;">Store: <strong>${order.shop_name || "Partner Store"}</strong></p>
            <p style="margin: 0.25rem 0; color: #6b7280;">Status: <span class="user-badge" style="background-color: ${order.status === "delivered" ? "var(--success)" : "var(--warning)"}">${order.status.toUpperCase()}</span></p>
            <p style="margin: 0.5rem 0; font-weight: 600;">Total: ₹${order.total || order.total_price}</p>
        </div>
      `;
    });
    container.innerHTML = html;
  } catch (error) {
    showAlert("Failed to load orders", "danger");
  }
}

// ===== SHOPKEEPER FUNCTIONS =====
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/shopkeeper/dashboard`, {
      credentials: "include",
    });
    const data = await response.json();

    document.getElementById("totalProducts").textContent =
      data.total_products || 0;
    document.getElementById("ordersToday").textContent = data.orders_today || 0;
    document.getElementById("revenueToday").textContent =
      "₹" + (data.revenue_today || 0);
    document.getElementById("lowStockCount").textContent =
      data.low_stock_items || 0;

    loadInventory();
    loadShopOrders();
  } catch (error) {
    showAlert("Failed to load dashboard", "danger");
  }
}

async function loadInventory() {
  try {
    const response = await fetch(`${API_BASE}/shopkeeper/products`, {
      credentials: "include",
    });
    const products = await response.json();

    const container = document.getElementById("inventoryTable");
    let html =
      '<table class="product-table"><thead><tr><th>Name</th><th>Price</th><th>Qty</th><th>Action</th></tr></thead><tbody>';

    products.forEach((product) => {
      html += `
        <tr>
            <td>${product.name}</td>
            <td>₹${product.price}</td>
            <td>${product.quantity}</td>
            <td><button class="btn btn-danger" onclick="deleteProduct('${product.id || product._id}')" style="width: auto; padding: 6px 12px; font-size: 12px;">Delete</button></td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (error) {
    showAlert("Failed to load inventory", "danger");
  }
}

async function loadShopOrders() {
  try {
    const response = await fetch(`${API_BASE}/shopkeeper/orders`, {
      credentials: "include",
    });
    const orders = await response.json();

    const container = document.getElementById("shopOrdersContainer");
    if (!orders || orders.length === 0) {
      container.innerHTML = "<p>No orders yet</p>";
      return;
    }

    let html = "";
    orders.forEach((order) => {
      html += `
        <div class="card">
            <h4>Order #${order.id || order._id} from ${order.customer_name || "Customer"}</h4>
            <p style="margin: 0.5rem 0; color: #6b7280;">Total: ₹${order.total || order.total_price}</p>
            ${
              order.status !== "delivered"
                ? `<button class="btn btn-success" onclick="markDelivered('${order.id || order._id}')" style="margin-top: 1rem; width: auto;">Mark Delivered</button>`
                : `<span class="user-badge" style="background: var(--success)">Delivered</span>`
            }
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    showAlert("Failed to load orders", "danger");
  }
}

async function addProduct() {
  const name = document.getElementById("productName").value;
  const category = document.getElementById("productCategory").value;
  const price = parseFloat(document.getElementById("productPrice").value || 0);
  const quantity = parseInt(document.getElementById("productQty").value || 0);

  try {
    const response = await fetch(`${API_BASE}/shopkeeper/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        category,
        price,
        quantity,
        description: "",
      }),
    });

    if (!response.ok) {
      showAlert("Failed to add product", "danger");
      return;
    }

    closeModal("addProductModal");
    showAlert("Product added successfully!", "success");

    document.getElementById("productName").value = "";
    document.getElementById("productCategory").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productQty").value = "";

    loadInventory();
    loadDashboard();
  } catch (error) {
    showAlert("Failed to add product", "danger");
  }
}

async function deleteProduct(productId) {
  if (!confirm("Delete this product?")) return;

  try {
    const response = await fetch(
      `${API_BASE}/shopkeeper/products/${productId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (!response.ok) {
      showAlert("Failed to delete product", "danger");
      return;
    }

    showAlert("Product deleted!", "success");
    loadInventory();
    loadDashboard();
  } catch (error) {
    showAlert("Failed to delete product", "danger");
  }
}

async function markDelivered(orderId) {
  try {
    const response = await fetch(`${API_BASE}/shopkeeper/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "delivered" }),
    });

    if (!response.ok) {
      showAlert("Failed to update order", "danger");
      return;
    }

    showAlert("Order marked as delivered!", "success");
    loadShopOrders();
    loadDashboard();
  } catch (error) {
    showAlert("Failed to update order", "danger");
  }
}

// ===== ADMIN FUNCTIONS =====
async function loadAdminDashboard() {
  try {
    const response = await fetch(`${API_BASE}/admin/dashboard`, {
      credentials: "include",
    });
    const data = await response.json();

    document.getElementById("totalUsers").textContent = data.total_users || 0;
    document.getElementById("totalShops").textContent = data.total_shops || 0;
    document.getElementById("adminOrders").textContent = data.total_orders || 0;
    document.getElementById("adminRevenue").textContent =
      "₹" + (data.total_revenue || 0);

    loadAllUsers();
  } catch (error) {
    showAlert("Failed to load admin dashboard", "danger");
  }
}

async function loadAllUsers() {
  try {
    const response = await fetch(`${API_BASE}/admin/users`, {
      credentials: "include",
    });
    const users = await response.json();

    const container = document.getElementById("usersTable");
    let html =
      '<table class="product-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>';

    users.forEach((user) => {
      html += `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td><button class="btn btn-danger" onclick="deleteUserAdmin('${user.id || user._id}')" style="width: auto; padding: 6px 12px; font-size: 12px;">Delete</button></td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (error) {
    showAlert("Failed to load users", "danger");
  }
}

async function deleteUserAdmin(userId) {
  if (!confirm("Delete this user?")) return;

  try {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      showAlert("Failed to delete user", "danger");
      return;
    }

    showAlert("User deleted!", "success");
    loadAllUsers();
    loadAdminDashboard();
  } catch (error) {
    showAlert("Failed to delete user", "danger");
  }
}

async function verifyAdmin() {
  const email = document.getElementById("adminEmail").value;

  try {
    const response = await fetch(`${API_BASE}/admin/admins/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      showAlert("Failed to verify admin", "danger");
      return;
    }

    showAlert("Admin verified!", "success");
    document.getElementById("adminEmail").value = "";
  } catch (error) {
    showAlert("Failed to verify admin", "danger");
  }
}

// ===== UTILS =====
function openAddProductModal() {
  document.getElementById("addProductModal").classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function showAlert(message, type = "success") {
  // Queries both top level and internal content view tracking targets natively
  const alerts = document.querySelectorAll("#alert");
  alerts.forEach((alert) => {
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
    setTimeout(() => {
      alert.classList.remove("show");
    }, 3000);
  });
}
