import { API_BASE } from '../shared/api.js';
let map;
let marker;

window.handleLogin = handleLogin;
window.switchTab = switchTab;
window.selectRole = selectRole;
window.findAddressOnMap = findAddressOnMap;
window.handleSignup = handleSignup;

async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      window.location.href = `../${data.user.role}/${data.user.role}.html`;
    } else {
      const errorMessage = data.error || "Login failed";
      if (
        confirm(`${errorMessage}. Would you like to go to the Sign Up page?`)
      ) {
        switchTab("signup");
      } else {
        showAlert(errorMessage, "danger");
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    showAlert("An unexpected error occurred.", "danger");
  }
}

function switchTab(tabType) {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  if (tabType === "signup") {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
    document
      .querySelectorAll(".auth-tab")
      .forEach((tab) =>
        tab.classList.toggle(
          "active",
          tab.innerText.toLowerCase().includes("sign up"),
        ),
      );
  } else {
    loginForm.style.display = "block";
    signupForm.style.display = "none";
    document
      .querySelectorAll(".auth-tab")
      .forEach((tab) =>
        tab.classList.toggle(
          "active",
          tab.innerText.toLowerCase().includes("login"),
        ),
      );
  }
}

function selectRole(element, role) {
  document
    .querySelectorAll(".role-btn")
    .forEach((btn) => btn.classList.remove("active"));
  element.classList.add("active");
  const shopFields = document.getElementById("shopkeeperFields");
  shopFields.style.display = role === "shopkeeper" ? "block" : "none";
  if (role === "shopkeeper") {
    if (!map) {
      initMap();
    } else {
      setTimeout(() => map.resize(), 100);
    }
  }
}

function initMap() {
  if (typeof maplibregl === "undefined") {
    console.error("MapLibre GL not loaded");
    return;
  }
  map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [77.209, 28.6139],
    zoom: 12,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.on("click", (e) => updateCoordinates(e.lngLat.lat, e.lngLat.lng));
}

function updateCoordinates(lat, lng) {
  document.getElementById("storeLat").value = lat;
  document.getElementById("storeLon").value = lng;
  if (marker) marker.remove();
  marker = new maplibregl.Marker({ color: "#e11d48" })
    .setLngLat([lng, lat])
    .addTo(map);
}

async function findAddressOnMap() {
  const address = document.getElementById("storeAddress").value.trim();
  const city = document.getElementById("storeCity").value.trim();
  if (!address || !city)
    return showAlert("Please enter Address and City.", "danger");
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${address}, ${city}`)}&limit=1`,
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      map.flyTo({ center: [lon, lat], zoom: 15 });
      updateCoordinates(lat, lon);
    } else {
      showAlert("Location not found.", "danger");
    }
  } catch (error) {
    showAlert("Error connecting to map service.", "danger");
  }
}

async function handleSignup() {
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const role = document
    .querySelector(".role-btn.active")
    .innerText.toLowerCase()
    .includes("shopkeeper")
    ? "shopkeeper"
    : "customer";

  let body = { name, email, password, role };

  if (role === "shopkeeper") {
    body = {
      ...body,
      shop_name: document.getElementById("storeName").value,
      city: document.getElementById("storeCity").value,
      address: document.getElementById("storeAddress").value,
      phone: document.getElementById("storePhone").value,
      latitude:
        Number.parseFloat(document.getElementById("storeLat").value) || 0,
      longitude:
        Number.parseFloat(document.getElementById("storeLon").value) || 0,
    };
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("token", data.token);
      showAlert("Account created successfully! Please login.", "success");
      switchTab("login");
    } else {
      showAlert(data.error || "Signup failed", "danger");
    }
  } catch (error) {
    showAlert("An unexpected error occurred.", "danger");
  }
}
