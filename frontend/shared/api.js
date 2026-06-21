const API_BASE = "http://localhost:5000/api";

function showAlert(message, type = "success") {
  const alertEl = document.querySelector(".alert");
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type} show`;
  setTimeout(() => alertEl.classList.remove("show"), 3000);
}
