import { API_BASE, showAlert, authHeaders } from "../shared/api.js";

let currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};
let map = null;
window.shoppingListItems = [];
window.shopItemsCache = {};
window.selectedShopId = null;
window.currentLatitude = null;
window.currentLongitude = null;

window.addEventListener("DOMContentLoaded", async () => {

  const isValid = await verifyToken();
  if (!isValid) {
    window.location.href = "../auth/auth.html";
    return;
  }
  
document.getElementById("userName").textContent =
    currentUser.name || "Customer";
  loadShops();
});

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
        (position) => {

            window.currentLatitude =
                position.coords.latitude;

            window.currentLongitude =
                position.coords.longitude;

            initMap(
                window.currentLatitude,
                window.currentLongitude
            );
        },

        () => {
            window.currentLatitude = 28.6139;
            window.currentLongitude = 77.2090;

            initMap(
                window.currentLatitude,
                window.currentLongitude
            );
        }
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
    const response = await fetch(
      `${API_BASE}/shops?lat=${lat}&lon=${lon}`,
      {
        headers: authHeaders()
      }
    );

    const shops = await response.json();

    const container = document.getElementById("shopsContainer");
    container.innerHTML = "";

    new maplibregl.Marker({
      color: "blue"
    })
      .setLngLat([lon, lat])
      .setPopup(
        new maplibregl.Popup().setHTML(`
          <h4>Your Current Location</h4>
        `)
      )
      .addTo(map);

    shops.forEach((shop) => {

      const card = document.createElement("div");
      card.className = "shop-card";

      const distanceText =
        shop.distance !== null &&
        shop.distance !== undefined
          ? `${shop.distance.toFixed(1)} km away`
          : "Distance unavailable";

     card.innerHTML = `
    <div class="shop-name">
        ${shop.name}
    </div>

    <div class="shop-distance">
        📍 ${distanceText}
    </div>

    <div style="
        display:flex;
        gap:10px;
        margin-top:10px;
        flex-wrap:wrap;
    ">
        <button
            class="btn btn-primary"
            onclick="
                window.viewShopProducts(
                    '${shop.id}'
                )
            "
        >
            View Products
        </button>

        <button
            class="btn btn-success"
            onclick="
                window.showShopLocation(
                    ${shop.latitude},
                    ${shop.longitude},
                    '${shop.name}'
                )
            "
        >
            View Location
        </button>
    </div>
`;

      container.appendChild(card);

      
      if (
        shop.latitude !== null &&
        shop.latitude !== undefined &&
        shop.longitude !== null &&
        shop.longitude !== undefined
      ) {
        const popup = new maplibregl.Popup({
  offset: 25
}).setHTML(`
  <h4>${shop.name}</h4>
  <p>${distanceText}</p>
  <p>${shop.address || ""}</p>
  <small>Click marker to show route</small>
`);

const marker = new maplibregl.Marker({
    color: "red"
})
.setLngLat([
    shop.longitude,
    shop.latitude
])
.setPopup(popup)
.addTo(map);

marker.getElement().addEventListener("click", () => {
    drawRoute(
        lon,
        lat,
        shop.longitude,
        shop.latitude
    );
});
      } else {
        console.warn(
          `Shop "${shop.name}" is missing latitude or longitude.`
        );
      }
    });

  } catch (err) {
    console.error("Error fetching shops:", err);
    showAlert("Failed to load shops", "danger");
  }
}
async function drawRoute(startLon, startLat, endLon, endLat) {

    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${startLon},${startLat};${endLon},${endLat}` +
        `?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    const route = data.routes[0].geometry;

    if (map.getSource("route")) {
        map.removeLayer("route");
        map.removeSource("route");
    }

    map.addSource("route", {
        type: "geojson",
        data: {
            type: "Feature",
            properties: {},
            geometry: route
        }
    });

    map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
            "line-join": "round",
            "line-cap": "round"
        },
        paint: {
            "line-color": "#0000ff",
            "line-width": 5
        }
    });

    const duration =
        Math.round(data.routes[0].duration / 60);

    const distance =
        (data.routes[0].distance / 1000).toFixed(1);

    alert(
        `Distance: ${distance} km\n` +
        `Estimated Time: ${duration} minutes`
    );
}
window.showShopLocation = async (
    shopLat,
    shopLon,
    shopName
) => {

    if (
        window.currentLatitude === null ||
        window.currentLongitude === null
    ) {
        showAlert(
            "Current location not available",
            "danger"
        );
        return;
    }

    map.flyTo({
        center: [shopLon, shopLat],
        zoom: 15,
        essential: true
    });

    await drawRoute(
        window.currentLongitude,
        window.currentLatitude,
        shopLon,
        shopLat
    );

    new maplibregl.Popup({
        closeOnClick: true
    })
    .setLngLat([
        shopLon,
        shopLat
    ])
    .setHTML(`
        <h3>${shopName}</h3>
        <p>Destination Shop</p>
    `)
    .addTo(map);
};
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

window.placeOrder = async () => {

    if (!window.selectedShopId) {
        showAlert(
            "Please calculate route first",
            "danger"
        );
        return;
    }

    const items =
        window.shoppingListItems.map(item => ({
            product_id: item.product_id,
            quantity: Number(item.quantity)
        }));

    try {

        const response =
            await fetch(
                `${API_BASE}/orders/pre-order`,
                {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        shop_id:
                            window.selectedShopId,
                        items
                    })
                }
            );

        const data =
            await response.json();

        if (response.ok) {

            showAlert(
                "Order placed successfully",
                "success"
            );

            window.shoppingListItems = [];
            window.selectedShopId = null;

            window.renderShoppingList();

            loadCustomerOrders();

            viewShopProducts(
                data.shop_id ||
                window.selectedShopId
            );

        } else {

            showAlert(
                data.error ||
                "Order failed",
                "danger"
            );
        }

    } catch (err) {

        console.log(err);

        showAlert(
            "Server error",
            "danger"
        );
    }
};

window.findOptimalShops = async () => {

    if (window.shoppingListItems.length === 0) {
        return showAlert(
            "Shopping list is empty",
            "danger"
        );
    }

    try {

        const res = await fetch(
            `${API_BASE}/calculate-route`,
            {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    items: window.shoppingListItems,
                    strategy:
                        document.querySelector(
                            'input[name="optimizationStrategy"]:checked'
                        ).value,
                    latitude: window.currentLatitude,
                    longitude: window.currentLongitude
                })
            }
        );

        const result = await res.json();

        if (!result.shops.length) {
            showAlert(
                "No shop found",
                "danger"
            );
            return;
        }

        const selectedShop =
            result.shops[0];

        window.selectedShopId =
            selectedShop.shop_id;

        document.getElementById(
            "searchResults"
        ).innerHTML = `
            <div class="card">
                <h3>${selectedShop.shop_name}</h3>
                <p>Distance:
                ${selectedShop.distance} km</p>

                ${selectedShop.available_items.map(item => `
                    <div>
                        ${item.name}
                        x ${item.needed}
                        - ₹${item.price}
                    </div>
                `).join("")}
            </div>
        `;

        showAlert(
            `${selectedShop.shop_name} selected`,
            "success"
        );

    } catch (err) {

        console.log(err);

        showAlert(
            "Failed to calculate route",
            "danger"
        );
    }
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
