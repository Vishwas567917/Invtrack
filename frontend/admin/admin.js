const API_BASE = "http://localhost:5000/api";
let currentUser = JSON.parse(localStorage.getItem("currentUser"));

window.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || currentUser.role !== "admin") {
    window.location.href = "/auth.html";
    return;
  }
  loadAdminDashboard();
});

async function loadAdminDashboard() {
  const res = await fetch(`${API_BASE}/admin/dashboard`, {
    credentials: "include",
  });
  const data = await res.json();
  document.getElementById("totalUsers").textContent = data.total_users;
  document.getElementById("totalShops").textContent = data.total_shops;
  loadAllUsers();
}

async function loadAllUsers() {
  const res = await fetch(`${API_BASE}/admin/users`, {
    credentials: "include",
  });
  const users = await res.json();
  const container = document.getElementById("usersTable");
  container.innerHTML = `
        <table class="product-table">
            <thead><tr><th>Name</th><th>Role</th><th>Action</th></tr></thead>
            <tbody>${users
              .map(
                (u) => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.role}</td>
                    <td><button class="btn btn-danger" onclick="deleteUser('${u.id}')">Delete</button></td>
                </tr>`,
              )
              .join("")}
            </tbody>
        </table>`;
}

async function deleteUser(userId) {
  if (!confirm("Are you sure?")) return;
  await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  loadAllUsers();
}
