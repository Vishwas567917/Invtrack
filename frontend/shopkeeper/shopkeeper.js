const API_BASE = "http://localhost:5000/api";
let currentUser = JSON.parse(localStorage.getItem("currentUser"));

window.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || currentUser.role !== "shopkeeper") {
    window.location.href = "/auth.html";
    return;
  }
  renderNavBar();
  renderSidebar();
  loadDashboard();
});

// --- UI Logic ---
function renderNavBar() {
  document.getElementById("userName").textContent = currentUser.name;
  document.getElementById("userRole").textContent = "SHOPKEEPER";
}

function renderSidebar() {
  const sidebar = document.getElementById("sidebar");
  const menus = [
    { icon: "fas fa-chart-bar", label: "Dashboard", section: "dashboard" },
    { icon: "fas fa-boxes", label: "Inventory", section: "inventory" },
    { icon: "fas fa-receipt", label: "Orders", section: "orders-shop" },
  ];
  sidebar.innerHTML = menus
    .map(
      (item, idx) => `
        <div class="sidebar-item ${idx === 0 ? "active" : ""}" onclick="showSection('${item.section}', event)">
            <i class="${item.icon}"></i> ${item.label}
        </div>
    `,
    )
    .join("");
}

function showSection(sectionName, event) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`section-${sectionName}`).classList.add("active");

  document
    .querySelectorAll(".sidebar-item")
    .forEach((item) => item.classList.remove("active"));
  if (event) event.currentTarget.classList.add("active");

  if (sectionName === "dashboard") loadDashboard();
  if (sectionName === "inventory") loadInventory();
  if (sectionName === "orders-shop") loadShopOrders();
}

// --- API Interactions ---
async function loadDashboard() {
  const res = await fetch(`${API_BASE}/shopkeeper/dashboard`, {
    credentials: "include",
  });
  const data = await res.json();
  document.getElementById("totalProducts").textContent =
    data.total_products || 0;
  document.getElementById("ordersToday").textContent = data.orders_today || 0;
  document.getElementById("revenueToday").textContent =
    "₹" + (data.revenue_today || 0);
}

async function loadInventory() {
  const res = await fetch(`${API_BASE}/shopkeeper/products`, {
    credentials: "include",
  });
  const products = await res.json();
  const container = document.getElementById("inventoryTable");
  container.innerHTML = `
        <table class="product-table">
            <thead><tr><th>Name</th><th>Price</th><th>Qty</th><th>Action</th></tr></thead>
            <tbody>${products
              .map(
                (p) => `
                <tr>
                    <td>${p.name}</td>
                    <td>₹${p.price}</td>
                    <td>${p.quantity}</td>
                    <td><button class="btn btn-danger" onclick="deleteProduct('${p.id}')">Delete</button></td>
                </tr>`,
              )
              .join("")}
            </tbody>
        </table>`;
}

async function addProduct() {
  const data = {
    name: document.getElementById("productName").value,
    price: parseFloat(document.getElementById("productPrice").value),
    quantity: parseInt(document.getElementById("productQty").value),
  };
  await fetch(`${API_BASE}/shopkeeper/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  loadInventory();
}

async function deleteProduct(id) {
  await fetch(`${API_BASE}/shopkeeper/products/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  loadInventory();
}

async function loadShopOrders() {
  const res = await fetch(`${API_BASE}/shopkeeper/orders`, {
    credentials: "include",
  });
  const orders = await res.json();
  document.getElementById("shopOrdersContainer").innerHTML = orders
    .map(
      (o) => `
        <div class="card">
            <h4>Order #${o.id}</h4>
            <button class="btn btn-success" onclick="markDelivered('${o.id}')">Mark Delivered</button>
        </div>`,
    )
    .join("");
}
