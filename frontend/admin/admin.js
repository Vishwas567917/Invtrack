import { API_BASE, showAlert } from "../shared/api.js";

let currentUser = JSON.parse(localStorage.getItem("currentUser"));

window.handleLogout = () => {
  localStorage.removeItem("currentUser");
  window.location.href = "../auth/auth.html";
};

window.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || currentUser.role !== "admin") {
    window.location.href = "../auth/auth.html";
    return;
  }
  loadAdminDashboard();
});

window.deleteUser = async (userId) => {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      showAlert("User deleted successfully", "success");
      loadAllUsers();
    } else {
      showAlert("Failed to delete user", "danger");
    }
  } catch (err) {
    console.error("Delete user error:", err);
    showAlert("Error connecting to server", "danger");
  }
};

window.switchSection = (sectionName, event) => {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`section-${sectionName}`).classList.add("active");

  document
    .querySelectorAll(".sidebar-btn")
    .forEach((btn) => btn.classList.remove("active"));
  if (event) event.currentTarget.classList.add("active");
};

async function loadAdminDashboard() {
  try {
    const res = await fetch(`${API_BASE}/admin/dashboard`, {
      credentials: "include",
    });
    const data = await res.json();
    document.getElementById("totalUsers").textContent = data.total_users || 0;
    document.getElementById("totalShops").textContent = data.total_shops || 0;
    loadAllUsers();
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

async function loadAllUsers() {
  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      credentials: "include",
    });
    const data = await res.json();

    console.log("API Response:", data);
    const usersArray = Array.isArray(data) ? data : data.users || [];

    const container = document.getElementById("usersTable");

    if (usersArray.length === 0) {
      container.innerHTML = "<p>No users found.</p>";
      return;
    }

    container.innerHTML = `
        <table class="product-table">
            <thead><tr><th>Name</th><th>Role</th><th>Action</th></tr></thead>
            <tbody>${usersArray
              .map(
                (u) => `
                <tr>
                    <td>${u.name || "N/A"}</td>
                    <td>${u.role || "N/A"}</td>
                    <td><button class="btn btn-danger" onclick="window.deleteUser('${u.id}')">Delete</button></td>
                </tr>`,
              )
              .join("")}
            </tbody>
        </table>`;
  } catch (err) {
    console.error("Load users error:", err);
    document.getElementById("usersTable").innerHTML =
      "<p>Error loading users.</p>";
  }
}
