document.addEventListener("DOMContentLoaded", async () => {
  console.log("dashboard.js loaded");

  // 1️⃣ Wait for rolesReady
  if (!window.CURRENT_USER_ROLES) {
    await new Promise(resolve => {
      document.addEventListener("rolesReady", resolve, { once: true });
    });
  }

  const roles = window.CURRENT_USER_ROLES;
  console.log("✅ Roles loaded:", roles);

  // 2️⃣ Sidebar element
  const sidebar = document.getElementById("sidebar");

  // 3️⃣ Load sidebar HTML
  try {
    const res = await fetch("components/sidebar.html");
    sidebar.innerHTML = await res.text();
    sidebar.classList.add("sidebar", "bg-dark", "text-white");

    // 🔹 Apply role restrictions immediately after sidebar is in DOM
    console.log("CURRENT_USER_ROLES at sidebar load:", window.CURRENT_USER_ROLES);
    if (window.applyRoleRestrictions) window.applyRoleRestrictions(sidebar);

    // 4️⃣ Sidebar toggle
    const toggleBtn = document.getElementById("toggleSidebar");
    const collapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (collapsed) sidebar.classList.add("collapsed");
    if (toggleBtn) toggleBtn.textContent = collapsed ? "☰" : "←";

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        const isCollapsed = sidebar.classList.contains("collapsed");
        toggleBtn.textContent = isCollapsed ? "☰" : "←";
        localStorage.setItem("sidebarCollapsed", isCollapsed);
      });
    }

    // 5️⃣ Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", () => window.logout && window.logout());

    // 6️⃣ Navigation click
    sidebar.querySelectorAll("[data-page]").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        loadPage(link.dataset.page);
      });
    });

  } catch (err) {
    console.error("Failed to load sidebar:", err);
    sidebar.innerHTML = `<p class="text-danger">Failed to load sidebar</p>`;
    return;
  }

  // 7️⃣ Load default page
  loadPage("reports-daily");
});

/* =========================================
   PAGE LOADER
========================================= */
async function loadPage(page) {
  const url = `pages/${page}.html`;
  console.log("Loading page:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);

    const html = await res.text();
    document.getElementById("mainContent").innerHTML = html;

    switch (page) {
      case "stock-input":
        initStockPage();
        loadStockData();
        break;
      case "sales-input":
        initSalesPage();
        break;
      case "movement":
        initMovementPage();
        break;
      case "reports-daily":
        loadDashboard();
        break;
      case "platforms":
        loadPlatforms();
        break;
      case "users":
        initUsersPage();
        loadPlatforms();
        loadStores();
        break;
    }

  } catch (err) {
    console.error("Page load failed:", err);
    document.getElementById("mainContent").innerHTML =
      `<div class="text-danger p-3">Failed to load page: ${page}</div>`;
  }
}