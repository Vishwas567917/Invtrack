async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (response.ok) {
    localStorage.setItem("currentUser", JSON.stringify(data.user));
    window.location.href = `../${data.user.role}/${data.user.role}.html`;
  } else {
    showAlert(data.error || "Login failed", "danger");
  }
}
