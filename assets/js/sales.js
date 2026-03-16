let stockList = [];
let platformList = [];
let itemIndex = 0;
let currentNetProfit = 0;

/* =========================
   INIT PAGE
========================= */
async function initSalesPage() {
  console.log("🧾 Sales page loaded");

  try {
    console.log("Loading stock...");
    await loadStock();
    console.log("Stock loaded successfully");

    console.log("Loading platforms...");
    await loadPlatforms2();
    console.log("Platforms loaded successfully");

    await loadStores2();
    addItemRow();

  } catch (err) {
    console.error("Init failed:", err);
  }
}
/* =========================
   LOAD STOCK
========================= */
async function loadStock() {
  const { data, error } = await supabaseClient
    .schema("inventory")
    .from("stock")
    .select("id, item_name, category, price, buying_price");

  if (error) {
    alert("Failed to load stock");
    console.error(error);
    return;
  }

  stockList = data;
}

/* =========================
   LOAD PLATFORMS
========================= */
async function loadPlatforms2() {

  console.log("➡ loadPlatforms started");

  try {

    const { data, error } = await supabaseClient
      .from("platforms")
      .select("*");

    console.log("Query finished");

    if (error) {
      console.error("Supabase error:", error);
      alert("Failed to load platforms");
      return;
    }

    console.log("Platforms data:", data);

    platformList = data;

    const select = document.getElementById("marketplace");

    console.log("Marketplace element:", select);

    if (!select) {
      console.log("Marketplace element not found");
      return;
    }

    select.innerHTML = `
      <option value="">-- Select Marketplace --</option>
      ${platformList.map(p =>
        `<option value="${p.id}" data-percent="${p.percentage}">
          ${p.name}
        </option>`
      ).join("")}
    `;

  } catch (err) {
    console.error("Crash inside loadPlatforms:", err);
  }
}


/* =========================
   ADD ITEM ROW
========================= */
function addItemRow() {
  const tbody = document.getElementById("itemsBody");

  const row = document.createElement("tr");
  row.dataset.index = itemIndex;

  row.innerHTML = `
    <td>
  <select class="form-select kategori"
          onchange="onCategoryChange(this)">
    <option value="">-- select category --</option>
    ${[...new Set(stockList.map(s => s.category))]
      .map(c => `<option value="${c}">${c}</option>`)
      .join("")}
      </select>
    </td>

    <td>
      <select class="form-select nama-barang"
        onchange="onProductChange(this)">
        <option value="">-- select --</option>
        ${stockList.map(s =>
          `<option value="${s.id}"
             data-price="${s.price}">
            ${s.item_name}
          </option>`
        ).join("")}
      </select>
    </td>

    <td>
      <input type="number"
        class="form-control qty"
        value="1"
        min="1"
        onchange="recalcRow(this)">
    </td>

    <td>
      <input type="number"
        class="form-control harga"
        readonly>
    </td>

    <td>
      <input type="number"
        class="form-control subtotal"
        readonly>
    </td>

    <td class="text-center">
      <button class="btn btn-sm btn-danger"
        onclick="removeRow(this)">✕</button>
    </td>
  `;

  tbody.appendChild(row);
  itemIndex++;
}

/* =========================
   PRODUCT SELECT
========================= */
function onProductChange(select) {
  const row = select.closest("tr");
  const price = select.selectedOptions[0]?.dataset.price || 0;

  row.querySelector(".harga").value = price;
  recalcRow(row.querySelector(".qty"));
}

/* =========================
   RECALCULATE ROW
========================= */
function recalcRow(input) {
  const row = input.closest("tr");

  const qty = Number(row.querySelector(".qty").value || 0);
  const harga = Number(row.querySelector(".harga").value || 0);

  row.querySelector(".subtotal").value = qty * harga;

  recalcGrandTotal();
}

/* =========================
   MARKETPLACE CHANGE
========================= */
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "marketplace") {
    calculatePlatformFee();
  }

  if (e.target && (e.target.id === "biaya_layanan" || e.target.id === "diskon_lain")) {
    recalcGrandTotal();
  }
});

/* =========================
   PLATFORM FEE CALC
========================= */
function calculatePlatformFee() {

  const select = document.getElementById("marketplace");
  const selected = select.selectedOptions[0];

  if (!selected || !selected.dataset.percent) {
    document.getElementById("biaya_layanan").value = 0;
    recalcGrandTotal();
    return;
  }

  const percent = Number(selected.dataset.percent);

  let subtotal = 0;
  document.querySelectorAll(".subtotal").forEach(s => {
    subtotal += Number(s.value || 0);
  });

  const fee = subtotal * (percent / 100);

  document.getElementById("biaya_layanan").value =
    Math.round(fee);

  recalcGrandTotal();
}

/* =========================
   GRAND TOTAL + NET PROFIT
========================= */
function recalcGrandTotal() {

  let subtotal = 0;

  document.querySelectorAll(".subtotal").forEach(s => {
    subtotal += Number(s.value || 0);
  });

  // 🔥 Always recalculate platform fee
  const select = document.getElementById("marketplace");
  const selected = select?.selectedOptions[0];

  let biaya = 0;

  if (selected && selected.dataset.percent) {
    const percent = Number(selected.dataset.percent);
    biaya = Math.round(subtotal * (percent / 100));
  }

  // 🔥 Update biaya_layanan field
  document.getElementById("biaya_layanan").value = biaya;

  const diskon = Number(document.getElementById("diskon_lain").value || 0);

  const grandTotal = subtotal - biaya - diskon;

  document.getElementById("grandTotal").textContent =
    grandTotal.toLocaleString("id-ID");

  // 🔥 Calculate both profit types
  let totalCost = 0;

  document.querySelectorAll("#itemsBody tr").forEach(row => {

    const stockId = row.querySelector(".nama-barang").value;
    const qty = Number(row.querySelector(".qty").value || 0);

    const stockItem = stockList.find(s => s.id == stockId);
    if (!stockItem) return;

    totalCost += Number(stockItem.buying_price || 0) * qty;
  });

  window.currentPureNetProfit = subtotal - totalCost - biaya - diskon;
  currentNetProfit = subtotal - totalCost;
}

/* =========================
   NET PROFIT (BACKGROUND)
========================= */
function calculateProfits(subtotal, grandTotal) {

  let totalCost = 0;

  document.querySelectorAll("#itemsBody tr").forEach(row => {

    const stockId = row.querySelector(".nama-barang").value;
    const qty = Number(row.querySelector(".qty").value || 0);

    const stockItem = stockList.find(s => s.id == stockId);
    if (!stockItem) return;

    const buyingPrice = Number(stockItem.buying_price || 0);
    totalCost += buyingPrice * qty;
  });

    const biaya = Number(document.getElementById("biaya_layanan")?.value || 0);
    const diskon = Number(document.getElementById("diskon_lain")?.value || 0);

    const pureNetProfit = subtotal - totalCost - biaya - diskon;
    const finalNetProfit = subtotal - totalCost - biaya - diskon;

  return {
    pureNetProfit,
    finalNetProfit
  };
}

/* =========================
   REMOVE ROW
========================= */
function removeRow(btn) {
  btn.closest("tr").remove();
  recalcGrandTotal();
}


function validateSalesForm() {

  const marketplace = document.getElementById("marketplace").value;
  const store = document.getElementById("nama_toko").value;
  const orderNo = document.getElementById("no_pesanan").value.trim();

  if (!marketplace) {
    alert("Please select a marketplace");
    return false;
  }

  if (!store) {
    alert("Please select a store");
    return false;
  }

  if (!orderNo) {
    alert("Order number is required");
    return false;
  }

  // check items
  const rows = document.querySelectorAll("#itemsBody tr");

  if (rows.length === 0) {
    alert("Add at least one product");
    return false;
  }

  for (let row of rows) {

    const category = row.querySelector(".kategori").value;
    const product = row.querySelector(".nama-barang").value;
    const qty = Number(row.querySelector(".qty").value);

    if (!category) {
      alert("Please select category for all items");
      return false;
    }

    if (!product) {
      alert("Please select product for all items");
      return false;
    }

    if (!qty || qty <= 0) {
      alert("Quantity must be greater than 0");
      return false;
    }

  }

  return true;

}
/* =========================
   SAVE SALES
========================= */
async function saveSales() {

  if (!validateSalesForm()) return;

  if(!confirm("Do you want to save the sales?")) return;
  const selectedMarketplace =
    document.getElementById("marketplace")
      .selectedOptions[0];

  const sales = {
    nama_pelanggan: document.getElementById("nama_pelanggan").value,
    kota_tujuan: document.getElementById("kota_tujuan").value,
    no_pesanan: document.getElementById("no_pesanan").value,

    marketplace: selectedMarketplace?.text || null,

    nama_toko: document.getElementById("nama_toko").value,
    kurir: document.getElementById("kurir").value,

    biaya_layanan: Number(document.getElementById("biaya_layanan").value || 0),
    diskon_lain: Number(document.getElementById("diskon_lain").value || 0),

    grand_total: Number(
      document.getElementById("grandTotal")
        .textContent.replace(/\./g, "")
    ),

    net_profit: currentNetProfit,               // Final profit
    pure_net_profit: window.currentPureNetProfit, // Product-only profit
    
    status: "ACTIVE",

    keterangan: document.getElementById("status").value
  };

  const items = [];

  document.querySelectorAll("#itemsBody tr").forEach(row => {
    items.push({
      stock_id: row.querySelector(".nama-barang").value,
      qty: Number(row.querySelector(".qty").value),
      harga: Number(row.querySelector(".harga").value),
      subtotal: Number(row.querySelector(".subtotal").value)
    });
  });

  const { error } = await supabaseClient.rpc(
    "create_sales_transaction",
    {
      sales_data: sales,
      items_data: items
    }
  );

  if (error) {
    alert(error.message);
    return;
  }

  alert("✅ Sales saved");
  location.reload();
}


function onCategoryChange(select) {

  const row = select.closest("tr");

  const category = select.value;

  const productSelect =
      row.querySelector(".nama-barang");


  if (!category) {

    productSelect.innerHTML =
      `<option value="">-- select --</option>`;

    return;

  }


  const filtered =
      stockList.filter(s =>
          s.category === category
      );


  productSelect.innerHTML =
      `<option value="">-- select --</option>` +
      filtered.map(s =>
          `<option value="${s.id}"
              data-price="${s.price}">
              ${s.item_name}
          </option>`
      ).join("");

}

async function loadStores2() {

  const { data, error } = await supabaseClient
    .from("master_stores")
    .select("*")
    .order("store_name");

  if (error) {
    console.error("Failed to load stores", error);
    return;
  }

  const select = document.getElementById("nama_toko");

  select.innerHTML = `
    <option value="">-- Select Store --</option>
    ${data.map(s => `
      <option value="${s.store_name}">
        ${s.store_name}
      </option>
    `).join("")}
  `;
}