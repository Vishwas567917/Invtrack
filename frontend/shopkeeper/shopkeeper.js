let currentUser = JSON.parse(localStorage.getItem("currentUser"));

// ==============================
// AUTH HEADERS
// ==============================

function authHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
    };
}

// ==============================
// ALERT
// ==============================

function showAlert(message, type) {
    alert(message);
    console.log(`${type}: ${message}`);
}

// ==============================
// INITIAL LOAD
// ==============================

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
    switchSection(null, "dashboard");

});

// ==============================
// SECTION SWITCH
// ==============================

function switchSection(event, sectionName) {

    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });

    document
        .getElementById(`section-${sectionName}`)
        .classList.add("active");

    document.querySelectorAll(".sidebar-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    if (event) {
        event.currentTarget.classList.add("active");
    }

    if (sectionName === "dashboard") {
        loadDashboard();
    }

    if (sectionName === "inventory") {
        loadInventory();
    }

    if (sectionName === "orders-shop") {
        loadShopOrders();
    }

}

// ==============================
// DASHBOARD
// ==============================

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_BASE}/shopkeeper/dashboard`,
            {
                headers: authHeaders()
            }
        );

        if (response.status === 401) {
            handleLogout();
            return;
        }

        const data = await response.json();

        document.getElementById("totalProducts").textContent =
            data.total_stock ?? 0;

        document.getElementById("inventoryValue").textContent =
            "₹" + (data.inventory_value ?? 0);

        document.getElementById("revenueToday").textContent =
            "₹" + (data.total_product_price ?? 0);

        document.getElementById("lowStockCount").textContent =
            data.low_stock_count ?? 0;

    }

    catch (error) {

        console.error(error);

        showAlert(
            "Unable to load dashboard.",
            "danger"
        );

    }

}

// ==============================
// INVENTORY
// ==============================

async function loadInventory() {

    try {

        const response = await fetch(
            `${API_BASE}/shopkeeper/products`,
            {
                headers: authHeaders()
            }
        );

        if (response.status === 401) {
            handleLogout();
            return;
        }

        const products = await response.json();

        const container =
            document.getElementById("inventoryTable");

        if (!Array.isArray(products) || products.length === 0) {

            container.innerHTML =
                "<p>No products found. Add your first product!</p>";

            return;

        }

        container.innerHTML = `

<table class="product-table">

<thead>

<tr>

<th>Name</th>
<th>Category</th>
<th>Price</th>
<th>Quantity</th>
<th>Action</th>

</tr>

</thead>

<tbody>

${products.map(product => `

<tr>

<td>${product.name}</td>

<td>${product.category}</td>

<td>₹${product.price}</td>

<td>${product.quantity}</td>

<td>

<button
class="btn btn-danger"
onclick="deleteProduct('${product.id}')">

Delete

</button>

</td>

</tr>

`).join("")}

</tbody>

</table>

`;

    }

    catch (error) {

        console.error(error);

        showAlert(
            "Failed to load inventory.",
            "danger"
        );

    }

}

// ==============================
// OPEN MODAL
// ==============================

function openAddProductModal() {

    document
        .getElementById("addProductModal")
        .classList.add("active");

}

// ==============================
// CLOSE MODAL
// ==============================

function closeModal(id) {

    document
        .getElementById(id)
        .classList.remove("active");

}
// ==============================
// ADD PRODUCT
// ==============================

async function addProduct() {

    const nameInput = document.getElementById("productName");
    const categoryInput = document.getElementById("productCategory");
    const priceInput = document.getElementById("productPrice");
    const quantityInput = document.getElementById("productQty");

    const name = nameInput.value.trim();
    const category = categoryInput.value.trim();
    const price = parseFloat(priceInput.value);
    const quantity = parseInt(quantityInput.value);

    if (
        !name ||
        !category ||
        isNaN(price) ||
        isNaN(quantity)
    ) {
        showAlert("Please fill all fields.", "danger");
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/shopkeeper/products`,
            {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    name,
                    category,
                    price,
                    quantity
                })
            }
        );

        if (!response.ok) {
            throw new Error("Unable to add product.");
        }

        nameInput.value = "";
        categoryInput.value = "";
        priceInput.value = "";
        quantityInput.value = "";

        closeModal("addProductModal");

        // Refresh everything
        await loadInventory();
        await loadDashboard();

        showAlert(
            "Product added successfully.",
            "success"
        );

    }

    catch (error) {

        console.error(error);

        showAlert(
            "Failed to add product.",
            "danger"
        );

    }

}

// ==============================
// DELETE PRODUCT
// ==============================

async function deleteProduct(id) {

    if (!confirm("Delete this product?")) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/shopkeeper/products/${id}`,
            {
                method: "DELETE",
                headers: authHeaders()
            }
        );

        if (!response.ok) {

            const err = await response.json();

            throw new Error(
                err.error || "Delete failed"
            );

        }

        showAlert(
            "Product deleted successfully.",
            "success"
        );

        // Refresh inventory and dashboard
        await loadInventory();
        await loadDashboard();

    }

    catch (error) {

        console.error(error);

        showAlert(
            error.message,
            "danger"
        );

    }

}

// ==============================
// LOAD ORDERS
// ==============================
async function loadShopOrders() {

    try {

        const response = await fetch(
            `${API_BASE}/shopkeeper/orders`,
            {
                headers: authHeaders()
            }
        );

        const orders = await response.json();

        const container =
            document.getElementById("shopOrdersContainer");

        if (!orders.length) {

            container.innerHTML = `
                <div class="card">
                    <h3>No Orders Yet</h3>
                </div>
            `;

            return;
        }

        container.innerHTML = orders.map((order, index) =>  `

<div class="card order-card">

<h3>Order #${index + 1}</h3>

<p><strong>Customer :</strong> ${order.customer_name}</p>

<p><strong>Shop :</strong> ${order.shop_name}</p>

<p><strong>Status :</strong>
<span class="${order.status.toLowerCase()}">
${order.status}
</span>
</p>

<p><strong>Total :</strong> ₹${order.total_price}</p>

<p><strong>Date :</strong> ${order.created_at}</p>

<h4>Items</h4>

<ul>

${order.items.map(item => `

<li>

${item.product}

×

${item.quantity}

(₹${item.price})

</li>

`).join("")}

</ul>

${order.status.toLowerCase() !== "delivered"

?

`<button
class="btn btn-primary"
onclick="markDelivered(${order.id})">

Mark Delivered

</button>`

:

`<button
class="btn btn-success"
disabled>

Delivered ✓

</button>`

}

</div>

`).join("");

    }

    catch(error){

        console.log(error);

    }

}
// ==============================
// MARK DELIVERED
// ==============================

async function markDelivered(id) {

    try {

        const response = await fetch(
            `${API_BASE}/shopkeeper/orders/${id}/deliver`,
            {
                method: "POST",
                headers: authHeaders()
            }
        );

        if (!response.ok) {
            throw new Error();
        }

        showAlert(
            "Order marked delivered.",
            "success"
        );

        loadShopOrders();

    }

    catch {

        showAlert(
            "Unable to update order.",
            "danger"
        );

    }

}

// ==============================
// LOGOUT
// ==============================

function handleLogout() {

    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");

    window.location.href =
        "../auth/auth.html";

}

// ==============================
// EXPORT FUNCTIONS
// ==============================

window.switchSection = switchSection;
window.handleLogout = handleLogout;
window.openAddProductModal = openAddProductModal;
window.closeModal = closeModal;
window.addProduct = addProduct;
window.deleteProduct = deleteProduct;
window.markDelivered = markDelivered;