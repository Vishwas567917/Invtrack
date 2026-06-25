let currentUser = JSON.parse(localStorage.getItem("currentUser"));

window.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || currentUser.role !== "shopkeeper") {
    window.location.href = "../auth/auth.html";
    return;
  }
  document.getElementById("userName").textContent = currentUser.name;
  loadDashboard();
});

function switchSection(sectionName) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`section-${sectionName}`).classList.add("active");

  document
    .querySelectorAll(".sidebar-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.currentTarget.classList.add("active");

  if (sectionName === "dashboard") loadDashboard();
  if (sectionName === "inventory") loadInventory();
  if (sectionName === "orders-shop") loadShopOrders();
}

function handleLogout() {
  localStorage.removeItem("currentUser");
  window.location.href = "../auth/auth.html";
}

function openAddProductModal() {
  document.getElementById("addProductModal").classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/shopkeeper/dashboard`, {
      credentials: "include",
    });
    const data = await res.json();
    document.getElementById("totalProducts").textContent =
      data.total_products || 0;
    document.getElementById("ordersToday").textContent = data.orders_today || 0;
    document.getElementById("revenueToday").textContent =
      "₹" + (data.revenue_today || 0);
    document.getElementById("lowStockCount").textContent =
      data.low_stock_count || 0;
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

async function loadInventory() {
  try {
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
  } catch (err) {
    showAlert("Failed to load inventory", "danger");
  }
}

async function addProduct() {
  const nameInput = document.getElementById("productName");
  const catInput = document.getElementById("productCategory");
  const priceInput = document.getElementById("productPrice");
  const qtyInput = document.getElementById("productQty");

  const data = {
    name: nameInput.value,
    category: catInput.value,
    price: parseFloat(priceInput.value),
    quantity: parseInt(qtyInput.value),
  };

  try {
    const res = await fetch(`${API_BASE}/shopkeeper/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (res.ok) {
      nameInput.value = "";
      catInput.value = "";
      priceInput.value = "";
      qtyInput.value = "";

      showAlert("Product added successfully", "success");
      closeModal("addProductModal");
      loadInventory();
    } else {
      const errorData = await res.json();
      showAlert(errorData.message || "Error adding product", "danger");
    }
  } catch (err) {
    console.error("Add Product Error:", err);
    showAlert("Failed to connect to server", "danger");
  }
}

async function deleteProduct(id) {
  const res = await fetch(`${API_BASE}/shopkeeper/products/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.ok) {
    showAlert("Product deleted", "success");
    loadInventory();
  }
}

async function loadShopOrders() {
  const res = await fetch(`${API_BASE}/shopkeeper/orders`, {
    credentials: "include",
  });
  const orders = await res.json();
  document.getElementById("shopOrdersContainer").innerHTML =
    orders.length > 0
      ? orders
          .map(
            (o) => `
        <div class="card" style="margin-bottom: 10px;">
            <h4>Order #${o.id}</h4>
            <button class="btn btn-primary" onclick="markDelivered('${o.id}')">Mark Delivered</button>
        </div>`,
          )
          .join("")
      : "<p>No active orders.</p>";
}

async function markDelivered(id) {
  const res = await fetch(`${API_BASE}/shopkeeper/orders/${id}/deliver`, {
    method: "POST",
    credentials: "include",
  });
  if (res.ok) {
    showAlert("Order marked as delivered", "success");
    loadShopOrders();
  } else {
    showAlert("Failed to update order", "danger");
  }
}
