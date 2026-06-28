import { API_BASE, showAlert, authHeaders } from "../shared/api.js";

let currentUser = JSON.parse(localStorage.getItem("currentUser"));
let map = null;
window.shoppingListItems = [];
window.shopItemsCache = {};

window.addEventListener("DOMContentLoaded", async () => {
  // 1. Verify token with backend upon loading
  const isValid = await verifyToken();
  if (!isValid) {
    window.location.href = "../auth/auth.html";
    return;
  }
  
  document.getElementById("userName").textContent = currentUser.name;
  loadShops();
});

// NEW: Verify Token function
async function verifyToken() {
  try {
    const res = await fetch(`${API_BASE}/verify-token`, { headers: authHeaders() });
    if (res.ok) return true;
  } catch (err) {
    console.error("Token verification failed:", err);
  }
  return false;
}

window.handleLogout = () => {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  window.location.href = "../auth/auth.html";
};

// Fixed Navigation Logic
window.showSection = (sectionName, event) => {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(`section-${sectionName}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".sidebar-btn").forEach((btn) => btn.classList.remove("active"));
  if (event && event.currentTarget) event.currentTarget.classList.add("active");

  if (sectionName === "orders") loadCustomerOrders();
  if (sectionName === "shops" && map) map.resize();
};

async function loadShops() {
  navigator.geolocation.getCurrentPosition(
    (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
    () => initMap(28.6139, 77.209),
  );
}

function initMap(lat, lon) {
  if (map) return;
  map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [lon, lat],
    zoom: 13,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  fetchShops(lat, lon);
}

async function fetchShops(lat, lon) {
  try {
    const response = await fetch(`${API_BASE}/shops?lat=${lat}&lon=${lon}`, { headers: authHeaders() });
    const shops = await response.json();
    const container = document.getElementById("shopsContainer");
    container.innerHTML = "";
    shops.forEach((shop) => {
      const card = document.createElement("div");
      card.className = "shop-card";
      card.innerHTML = `
        <div class="shop-name">${shop.name}</div>
        <div class="shop-distance">📍 ${shop.distance.toFixed(1)} km away</div>
        <button class="btn btn-primary" onclick="window.viewShopProducts('${shop.id}')">View Products</button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error fetching shops:", err);
  }
}

window.viewShopProducts = async (shopId) => {
  try {
    const res = await fetch(`${API_BASE}/shops/${shopId}/products`, { headers: authHeaders() });
    const products = await res.json();
    const container = document.getElementById("productsContainer");
    if (!products || products.length === 0) {
        container.innerHTML = `<p>No products available in this shop.</p>`;
        return;
    }
    const productHtml = products.map(product => `
        <div class="card" style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${product.name}</strong> - ₹${product.price ?? 0}
                <p style="margin: 0; font-size: 12px;">Stock: ${product.stock ?? 0}</p>
            </div>
            <button class="btn btn-primary" onclick="window.addToShoppingList('${product.name}', ${product.id})">Add to List</button>
        </div>
    `).join("");
    container.innerHTML = `<h3>Products in Shop</h3>` + productHtml;
  } catch (err) {
    console.error(err);
    showAlert("Failed to load products", "danger");
  }
};

window.addToShoppingList = (productName, productId) => {
    const existing = window.shoppingListItems.find(i => i.name === productName);
    if (existing) {
        existing.quantity += 1;
    } else {
        window.shoppingListItems.push({ id: Date.now(), product_id: productId, name: productName, quantity: 1 });
    }
    showAlert(`Added ${productName} to your list!`, "success");
    window.renderShoppingList();
};

window.placeOrder = async (shopId = 1) => {
    // 2. Correct mapping for backend
    const items = window.shoppingListItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
    }));

    try {
        const res = await fetch(`${API_BASE}/orders/pre-order`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ shop_id: shopId, items: items })
        });
        if (res.ok) {
            showAlert("Order placed successfully!", "success");
            window.shoppingListItems = [];
            window.renderShoppingList();
            loadCustomerOrders();
        } else {
            showAlert("Failed to place order", "danger");
        }
    } catch (err) {
        showAlert("Error connecting to server", "danger");
    }
};

window.findOptimalShops = async () => {
  if (window.shoppingListItems.length === 0) return showAlert("List empty!", "danger");
  const strategy = document.querySelector('input[name="optimizationStrategy"]:checked').value;
  try {
    const res = await fetch(`${API_BASE}/calculate-route`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ items: window.shoppingListItems, strategy: strategy })
    });
    const result = await res.json();
    document.getElementById("searchResults").innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
  } catch (err) { showAlert("Failed to calculate", "danger"); }
};

window.renderShoppingList = () => {
  const container = document.getElementById("shoppingListItems");
  if (!container) return;
  container.innerHTML = window.shoppingListItems.map((item, idx) => `
      <div class="shopping-list-item">
        <input type="text" value="${item.name}" disabled>
        <input type="number" value="${item.quantity}" oninput="window.shoppingListItems[${idx}].quantity = this.value">
        <button class="btn btn-danger" onclick="window.shoppingListItems.splice(${idx},1); window.renderShoppingList()">×</button>
      </div>
  `).join("");
};

async function loadCustomerOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`, { headers: authHeaders() });
    const orders = await res.json();
    const container = document.getElementById("ordersContainer");
    if (!orders || orders.length === 0) {
        container.innerHTML = `<p>No orders placed yet.</p>`;
        return;
    }
    container.innerHTML = orders.map(o => `
      <div class="card">
        <h4>Order #${o.id}</h4>
        <p>Shop: ${o.shop_name}</p>
        <p>Status: ${o.status} | Total: ₹${o.total}</p>
      </div>
    `).join("");
  } catch (err) { showAlert("Failed to load orders", "danger"); }
}

window.showSection = showSection;
window.handleLogout = handleLogout;
window.viewShopProducts = viewShopProducts;
window.addToShoppingList = addToShoppingList;
window.placeOrder = placeOrder;
window.findOptimalShops = findOptimalShops;
window.renderShoppingList = renderShoppingList;