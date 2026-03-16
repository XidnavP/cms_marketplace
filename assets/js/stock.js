window.initStockPage = function () {
  const form = document.getElementById("stockForm");
  console.log("Form found:", form);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ✅ Confirmation before Add/Edit
    if (!confirm("Are you sure you want to save this stock?")) return;

    const stockId = document.getElementById("stock_id").value;
    const item_name = document.getElementById("item_name").value.trim();
    const quantity = Number(document.getElementById("quantity").value);
    const buying_price = Number(document.getElementById("buying_price").value);
    const price = Number(document.getElementById("price").value);
    const category = document.getElementById("category").value;

    // 🟢 IF ADD MODE (no stock_id)
    if (!stockId) {

      const { data: stockData, error: stockError } = await supabaseClient
        .schema("inventory")
        .from("stock")
        .insert([{
          item_name,
          category,
          quantity: 0,
          buying_price,
          price
        }])
        .select()
        .single();

      if (stockError) return alert(stockError.message);

      const { error: movementError } = await supabaseClient.rpc(
        "apply_stock_movement",
        {
          p_stock_id: stockData.id,
          p_movement_type: "INITIAL",
          p_qty: quantity,
          p_buying_price: buying_price,
          p_notes: "Initial stock"
        }
      );

      if (movementError) return alert(movementError.message);

      alert("Stock created");

    } else {
        // 🟢 EDIT MODE
        const movementType = document.getElementById("movement_type").value;

        // 🔒 Fetch current stock first to validate
        const { data: currentStockData, error: stockFetchError } = await supabaseClient
          .schema("inventory")
          .from("stock")
          .select("quantity")
          .eq("id", stockId)
          .single();

        if (stockFetchError) return alert(stockFetchError.message);

        const currentStock = currentStockData.quantity;

        // 🔒 Prevent reducing stock below 0
        if (movementType === "RESTOCK" && currentStock + quantity < 0) {
          return alert("Error: Cannot reduce stock below 0!");
        }

        // 🔄 Apply movement safely
        const { error } = await supabaseClient.rpc(
          "apply_stock_movement",
          {
            p_stock_id: stockId,
            p_movement_type: movementType,
            p_qty: quantity,
            p_buying_price: movementType === "RESTOCK" ? buying_price : null,
            p_notes: "Manual edit"
          }
        );

        if (error) return alert(error.message);

        // Optional update selling price
        await supabaseClient
        .schema("inventory")
        .from("stock")
        .update({
          item_name,
          category,
          price,
          buying_price
        })
        .eq("id", stockId);

        alert("Stock updated");
    }

    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("stockModal")
    ).hide();

    form.reset();
    document.getElementById("stock_id").value = "";

    await loadStockData();
  });
};

window.loadStockData = async function () {
  console.log("📦 Loading stock data...");

  const { data, error } = await supabaseClient
    .schema("inventory")
    .from("stock")
    .select("*")
    .order("category", { ascending: true })
    .order("item_name", { ascending: true });

  if (error) {
    console.error("❌ Failed to load stock:", error);
    return;
  }

  console.log("✅ Stock data:", data);
  window.stockData = data
  window.renderCategoryFilter(data);
  window.renderStockTable(data);
  window.renderStockSummary(data);
};

window.renderStockTable = function (data) {
  const tbody = document.getElementById("stockTable");
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">No stock data</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.item_name}</td>
      <td>${item.category}</td>
      <td>${item.quantity}</td>
      <td>5</td>
      <td>${item.price}</td>
      <td>
        ${
          item.quantity <= 5
            ? `<span class="badge bg-danger">Low</span>`
            : `<span class="badge bg-success">OK</span>`
        }
      </td>

      <td class="text-end">
         <button class="btn btn-sm btn-outline-primary me-1"
    onclick="editStock(
      '${item.id}',
      '${item.item_name}',
      '${item.category}',
      ${item.buying_price},
      ${item.price}
    )">
    Edit
  </button>

  <button class="btn btn-sm btn-outline-danger"
    onclick="deleteStock('${item.id}')" data-role = "admin">
    Delete
  </button>
      </td>
    </tr>
  `).join("");
};

window.renderStockSummary = function (data) {
  document.getElementById("totalProducts").textContent = data.length;
  document.getElementById("totalStock").textContent =
    data.reduce((sum, i) => sum + i.quantity, 0);
  document.getElementById("lowStock").textContent =
    data.filter(i => i.quantity <= 5).length;

  document.getElementById("lastUpdated").textContent =
    data[0]?.created_at
      ? new Date(data[0].created_at).toLocaleString()
      : "-";
};

window.editStock = function(id, item_name, category, buying_price, price) {
  const modalEl = document.getElementById("stockModal");
  if (!modalEl) {
    console.error("Stock modal not found! Did you load the stock page first?");
    return;
  }

  // Now safe to set values
  document.getElementById("stock_id").value = id;
  document.getElementById("item_name").value = item_name;
  document.getElementById("category").value = category;
  document.getElementById("buying_price").value = buying_price;
  document.getElementById("price").value = price;

  document.getElementById("quantity").value = "";
  document.getElementById("movementWrapper").classList.remove("d-none");

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
};

window.openAddModal = function () {
  // ✅ Confirmation before opening add modal
  if (!confirm("Do you want to add a new stock item?")) return;

  const form = document.getElementById("stockForm");
  form.reset();

  document.getElementById("stock_id").value = "";
  document.getElementById("movementWrapper").classList.add("d-none");
  document.getElementById("stockModalTitle").innerText = "Add Stock";

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("stockModal")
  ).show();
};

window.deleteStock = async function (stockId) {
  // ✅ Confirmation before delete
  if (!confirm("Are you sure you want to delete this stock item?")) {
    return;
  }

  const { error } = await supabaseClient
    .schema("inventory")
    .from("stock")
    .delete()
    .eq("id", stockId);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Stock deleted");
  await loadStockData();
};

window.renderCategoryFilter = function(data) {

  const select = document.getElementById("categoryFilter");
  if (!select) return;

  const categories = [...new Set(data.map(i => i.category))];

  select.innerHTML =
    `<option value="">All Categories</option>` +
    categories.map(c =>
      `<option value="${c}">${c}</option>`
    ).join("");
};

document.addEventListener("change", function(e){

  if (e.target.id === "categoryFilter") {

    const category = e.target.value;

    let filtered = window.stockData;

    if (category) {
      filtered = window.stockData.filter(
        item => item.category === category
      );
    }

    window.renderStockTable(filtered);
  }

});


window.downloadStockExcel = function () {

  let data = window.stockData || [];

  if (!data.length) {
    alert("No stock data to export");
    return;
  }

  // Apply category filter if selected
  const category =
    document.getElementById("categoryFilter")?.value;

  if (category) {
    data =
      data.filter(item =>
        item.category === category
      );
  }

  // Format data for Excel
  const exportData = data.map(item => ({
    Item: item.item_name,
    Category: item.category,
    Quantity: item.quantity,
    BuyingPrice: item.buying_price,
    SellingPrice: item.price,
    Status: item.quantity <= 5 ? "Low" : "OK"
  }));

  const worksheet =
    XLSX.utils.json_to_sheet(exportData);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Stock"
  );

  XLSX.writeFile(
    workbook,
    "Stock_List.xlsx"
  );

};

window.searchStock = function () {

  const keyword =
    document.getElementById("stockSearch")
      .value
      .toLowerCase()
      .trim();

  let filtered = window.stockData;

  if (keyword) {

    filtered =
      window.stockData.filter(item =>
        item.item_name.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword)
      );

  }

  window.renderStockTable(filtered);

};

document.addEventListener("input", function(e){

  if (e.target.id === "stockSearch") {
    searchStock();
  }

});