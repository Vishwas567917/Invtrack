const API_BASE = "http://127.0.0.1:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function showAlert(message, type = "success") {
  const alertEl = document.querySelector(".alert");
  if (!alertEl) {
    alert(message);
    return;
  }
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type} show`;
  setTimeout(() => alertEl.classList.remove("show"), 3000);
}

globalThis.API_BASE = API_BASE;
globalThis.getToken = getToken;
globalThis.authHeaders = authHeaders;
globalThis.showAlert = showAlert;
