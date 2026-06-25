import { API_BASE, showAlert } from "../shared/api.js";

let currentUser = JSON.parse(localStorage.getItem("currentUser"));
let map = null;
window.shoppingListItems = [];
window.shopItemsCache = {};

window.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || currentUser.role !== "customer") {
    window.location.href = "../auth/auth.html";
    return;
  }

  document.getElementById("userName").textContent = currentUser.name;
  loadShops();
});

window.handleLogout = () => {
  localStorage.removeItem("currentUser");
  window.location.href = "../auth/auth.html";
};

window.showSection = (sectionName, event) => {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`section-${sectionName}`).classList.add("active");

  document
    .querySelectorAll(".sidebar-btn")
    .forEach((btn) => btn.classList.remove("active"));
  if (event) event.currentTarget.classList.add("active");

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
    const response = await fetch(`${API_BASE}/shops?lat=${lat}&lon=${lon}`, {
      credentials: "include",
    });
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

window.addShoppingListItem = () => {
  window.shoppingListItems.push({ id: Date.now(), name: "", quantity: 1 });
  renderShoppingList();
};

window.updateItem = (idx, field, value) => {
  window.shoppingListItems[idx][field] = value;
};

window.renderShoppingList = () => {
  const container = document.getElementById("shoppingListItems");
  container.innerHTML = window.shoppingListItems
    .map(
      (item, idx) => `
      <div class="shopping-list-item">
        <input type="text" placeholder="Product" value="${item.name}" oninput="window.updateItem(${idx}, 'name', this.value)">
        <input type="number" value="${item.quantity}" oninput="window.updateItem(${idx}, 'quantity', this.value)">
        <button class="btn btn-danger" onclick="window.shoppingListItems.splice(${idx},1); window.renderShoppingList()">×</button>
      </div>
    `,
    )
    .join("");
};

async function loadCustomerOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`, { credentials: "include" });
    const orders = await res.json();
    document.getElementById("ordersContainer").innerHTML = orders
      .map(
        (o) => `
      <div class="card">
        <h4>Order #${o.id}</h4>
        <p>Status: ${o.status}</p>
        <p>Total: ₹${o.total_price}</p>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    showAlert("Failed to load orders", "danger");
  }
}
