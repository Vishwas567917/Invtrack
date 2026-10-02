import {
  API_BASE,
  showAlert,
  authHeaders
} from "../shared/api.js";


let currentUser = null;


try {
  currentUser = JSON.parse(
    localStorage.getItem("currentUser")
  );
} catch (error) {
  console.error("Unable to read current user:", error);
  currentUser = null;
}

window.handleLogout = () => {

  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");

  window.location.href = "../auth/auth.html";
};



window.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");

  if (
    !currentUser ||
    currentUser.role !== "admin" ||
    !token
  ) {
    window.location.href = "../auth/auth.html";
    return;
  }

  const userNameElement =
    document.getElementById("userName");

  if (userNameElement) {
    userNameElement.textContent =
      currentUser.name || currentUser.email || "Administrator";
  }

  loadAdminDashboard();
});


function handleUnauthorized(res) {

  if (res.status === 401) {

    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");

    window.location.href = "../auth/auth.html";

    return true;
  }

  return false;
}



window.deleteUser = async (userId) => {

  if (
    !confirm(
      "Are you sure you want to delete this user?"
    )
  ) {
    return;
  }

  try {

    const res = await fetch(
      `${API_BASE}/admin/users/${userId}`,
      {
        method: "DELETE",
        headers: authHeaders()
      }
    );

    if (handleUnauthorized(res)) {
      return;
    }

    const data = await res.json();

    if (res.ok) {

      showAlert(
        data.message || "User deleted successfully",
        "success"
      );

      loadAllUsers();
      loadAdminDashboard();

    } else {

      showAlert(
        data.error || "Failed to delete user",
        "danger"
      );
    }

  } catch (err) {

    console.error("Delete user error:", err);

    showAlert(
      "Error connecting to server",
      "danger"
    );
  }
};



window.switchSection = (
  sectionName,
  event
) => {

  document
    .querySelectorAll(".section")
    .forEach((section) => {
      section.classList.remove("active");
    });

  const selectedSection =
    document.getElementById(
      `section-${sectionName}`
    );

  if (selectedSection) {
    selectedSection.classList.add("active");
  }

  document
    .querySelectorAll(".sidebar-btn")
    .forEach((button) => {
      button.classList.remove("active");
    });

  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }
};


async function loadAdminDashboard() {

  try {

    const res = await fetch(
      `${API_BASE}/admin/dashboard`,
      {
        method: "GET",
        headers: authHeaders()
      }
    );

    if (handleUnauthorized(res)) {
      return;
    }

    const data = await res.json();

    console.log("Dashboard API Response:", data);


    document.getElementById(
      "totalUsers"
    ).textContent = data.total_users ?? 0;



    document.getElementById(
      "totalShops"
    ).textContent = data.total_shops ?? 0;


    document.getElementById(
      "adminOrders"
    ).textContent = data.total_orders ?? 0;


    const revenue =
      Number(data.total_revenue || 0);

    document.getElementById(
      "adminRevenue"
    ).textContent =
      `₹${revenue.toFixed(2)}`;

    loadAllUsers();

  } catch (err) {

    console.error(
      "Dashboard error:",
      err
    );

    showAlert(
      "Unable to load admin dashboard",
      "danger"
    );
  }
}


async function loadAllUsers() {

  try {

    const res = await fetch(
      `${API_BASE}/admin/users`,
      {
        method: "GET",
        headers: authHeaders()
      }
    );

    if (handleUnauthorized(res)) {
      return;
    }

    const data = await res.json();

    console.log(
      "Users API Response:",
      data
    );

    const usersArray =
      Array.isArray(data)
        ? data
        : data.users || [];


    const container =
      document.getElementById(
        "usersTable"
      );


    if (usersArray.length === 0) {

      container.innerHTML =
        "<p>No users found.</p>";

      return;
    }


    container.innerHTML = `

      <table class="product-table">

        <thead>

          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Action</th>
          </tr>

        </thead>

        <tbody>

          ${usersArray
            .map(
              (u) => `

                <tr>

                  <td>
                    ${u.name || "N/A"}
                  </td>

                  <td>
                    ${u.email || "N/A"}
                  </td>

                  <td>
                    ${u.role || "N/A"}
                  </td>

                  <td>

                    <button
                      class="btn btn-danger"
                      onclick="window.deleteUser(${u.id})"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              `
            )
            .join("")}

        </tbody>

      </table>

    `;

  } catch (err) {

    console.error(
      "Load users error:",
      err
    );

    document.getElementById(
      "usersTable"
    ).innerHTML =
      "<p>Error loading users.</p>";
  }
}



window.verifyAdmin = async () => {

  const emailInput =
    document.getElementById(
      "adminEmail"
    );

  const email =
    emailInput.value.trim();


  if (!email) {

    showAlert(
      "Please enter an administrator email",
      "danger"
    );

    return;
  }


  try {

    const res = await fetch(
      `${API_BASE}/admin/verify`,
      {
        method: "POST",

        headers: {
          ...authHeaders(),
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email: email
        })
      }
    );


    if (handleUnauthorized(res)) {
      return;
    }


    const data =
      await res.json();


    if (res.ok && data.verified) {

      showAlert(
        `${data.user.name} is a verified administrator.`,
        "success"
      );

    } else {

      showAlert(
        data.message ||
        data.error ||
        "Administrator verification failed.",
        "danger"
      );
    }

  } catch (err) {

    console.error(
      "Verify admin error:",
      err
    );

    showAlert(
      "Error connecting to server",
      "danger"
    );
  }
};