let currentUser = JSON.parse(localStorage.getItem("currentUser"));

window.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || currentUser.role !== "shopkeeper") {
    window.location.href = "../auth/auth.html";
    return;
  }
  if (!localStorage.getItem("token")) {
    window.location.href = "../auth/auth.html";
    return;
  }
  document.getElementById("userName").textContent = currentUser.name;
  loadDashboard();
});

function switchSection(event, sectionName) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`section-${sectionName}`).classList.add("active");
  document
    .querySelectorAll(".sidebar-btn")
    .forEach((btn) => btn.classList.remove("active"));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }
  if (sectionName === "dashboard") loadDashboard();
  if (sectionName === "inventory") loadInventory();
  if (sectionName === "orders-shop") loadShopOrders();
}

function handleLogout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
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
      headers: authHeaders(),
    });
    if (res.status === 401) {
      handleLogout();
      return;
    }
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
      headers: authHeaders(),
    });
    if (res.status === 401) {
      handleLogout();
      return;
    }
    const products = await res.json();
    const container = document.getElementById("inventoryTable");
    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = "<p>No products found. Add your first product!</p>";
      return;
    }
    container.innerHTML = `
      <table class="product-table">
        <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Qty</th><th>Action</th></tr></thead>
        <tbody>
          ${products
            .map(
              (p) => `
            <tr>
              <td>${p.name}</td>
              <td>${p.category}</td>
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

  const name = nameInput.value.trim();
  const category = catInput.value.trim();
  const price = parseFloat(priceInput.value);
  const quantity = parseInt(qtyInput.value, 10);

  if (!name || !category) {
    showAlert("Please fill all required fields", "danger");
    return;
  }
  if (isNaN(price) || price <= 0) {
    showAlert("Please enter a valid price", "danger");
    return;
  }
  if (isNaN(quantity) || quantity < 0) {
    showAlert("Please enter a valid quantity", "danger");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/shopkeeper/products`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name, category, price, quantity }),
    });

    let responseData = {};
    try {
      responseData = await res.json();
    } catch {
      console.warn("Response is not JSON");
    }

    if (res.ok) {
      nameInput.value = "";
      catInput.value = "";
      priceInput.value = "";
      qtyInput.value = "";
      showAlert(
        responseData.message || "Product added successfully",
        "success",
      );
      closeModal("addProductModal");
      await loadInventory();
    } else {
      console.error("Server Error:", responseData);
      showAlert(
        responseData.error ||
          responseData.message ||
          `Server returned ${res.status}`,
        "danger",
      );
    }
  } catch (err) {
    console.error("Add Product Error:", err);
    showAlert("Failed to connect to server.", "danger");
  }
}

async function deleteProduct(id) {
  const res = await fetch(`${API_BASE}/shopkeeper/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.ok) {
    showAlert("Product deleted", "success");
    loadInventory();
  } else {
    showAlert("Failed to delete product", "danger");
  }
}

async function loadShopOrders() {
  try {
    const res = await fetch(`${API_BASE}/shopkeeper/orders`, {
      headers: authHeaders(),
    });
    if (res.status === 401) {
      handleLogout();
      return;
    }
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
  } catch (err) {
    showAlert("Failed to load orders", "danger");
  }
}

async function markDelivered(id) {
  const res = await fetch(`${API_BASE}/shopkeeper/orders/${id}/deliver`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (res.ok) {
    showAlert("Order marked as delivered", "success");
    loadShopOrders();
  } else {
    showAlert("Failed to update order", "danger");
  }
}

// Ensure functions are accessible to the HTML onclick attributes
window.switchSection = switchSection;
window.handleLogout = handleLogout;
window.openAddProductModal = openAddProductModal;
window.closeModal = closeModal;
window.deleteProduct = deleteProduct;
window.markDelivered = markDelivered;
window.addProduct = addProduct;