let searchTimeout = null;
let categoryreportList = [];

/* LOAD DASHBOARD */
async function loadDashboard() {
    await populateCategory();

    const startdate =
        document.getElementById("filterStartDate")?.value;

    const enddate =
        document.getElementById("filterEndDate")?.value;

    const category =
        document.getElementById("filterCategory")?.value || null;

    const search =
        document.getElementById("filterSearch")?.value || null;


    try {

        const { data, error } =
            await supabaseClient.rpc(
                "get_profit_dashboard",
                {
                    p_startdate: startdate || null,
                    p_enddate: enddate || null,
                    p_category: category || null,
                    p_search: search || null
                }
            );

        if (error) throw error;

        fillDashboard(data);

    }
    catch (error) {

        console.error(
            "Error loading dashboard:",
            error.message
        );

    }

}


/* FILL TABLE */
function fillDashboard(data) {

    const tbody =
        document.getElementById("profitTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    let totalSales = 0;
    let totalGross = 0;
    let totalNet = 0;
    let totalTxn = 0;


    if (!data || data.length === 0) {

        tbody.innerHTML =
        `
        <tr>
            <td colspan="9" class="text-center text-muted">
                No data found
            </td>
        </tr>
        `;

        updateSummary(0,0,0,0);

        return;
    }


    data.forEach(row => {

        const tr =
            document.createElement("tr");

        tr.innerHTML =
        `
        <td>${formatDate(row.txn_date)}</td>
        <td>${row.transaction_id}</td>
        <td>${row.name}</td>
        <td>${row.marketplace}</td>
        <td>${row.nama_toko}</td>
        <td>${row.kurir}</td>
        <td class="text-end text-success">${formatRupiah(row.gross_profit)}</td>
        <td class="text-end text-primary" data-role="admin">${formatRupiah(row.net_profit)}</td>
        <td>
            <button
            class="btn btn-sm btn-info"
            onclick="showDetail('${row.id}')">
            Detail
            </button>
        </td>
        `;

        tbody.appendChild(tr);

        totalSales += Number(row.total_qty);
        totalGross += Number(row.gross_profit);
        totalNet += Number(row.net_profit);
        totalTxn++;

    });


    updateSummary(
        totalSales,
        totalGross,
        totalNet,
        totalTxn
    );

}


/* UPDATE SUMMARY */
function updateSummary(
    totalSales,
    totalGross,
    totalNet,
    totalTxn
){

    const elSales =
        document.getElementById("totalSales");

    const elGross =
        document.getElementById("grossProfit");

    const elNet =
        document.getElementById("netProfit");

    const elTxn =
        document.getElementById("totalTxn");


    if (elSales)
        elSales.textContent =
            totalSales;

    if (elGross)
        elGross.textContent =
            formatRupiah(totalGross);

    if (elNet)
        elNet.textContent =
            formatRupiah(totalNet);

    if (elTxn)
        elTxn.textContent =
            totalTxn;

}


/* SEARCH AUTO */
function onSearchChange() {

    clearTimeout(searchTimeout);

    searchTimeout =
        setTimeout(() => {

            loadDashboard();

        }, 400);

}


/* FORMAT */
function formatRupiah(value) {

    return "Rp " +
        Number(value)
        .toLocaleString("id-ID");

}

function formatDate(dateString) {

    const date =
        new Date(dateString);

    return date
        .toLocaleDateString("id-ID");

}


/* AUTO LOAD */
document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadDashboard();

    }
);

async function showDetail(transactionId) {
    try {
      const { data, error } = await supabaseClient.rpc(
        "get_transaction_detail",
        { p_transaction_id: transactionId }
      );
  
      if (error) throw error;
  
      const tbody = document.getElementById("detailTable");
      tbody.innerHTML = "";
  
      if (!data || data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="text-center text-muted">No detail found</td>
          </tr>
        `;
      } else {
        // Build all rows first
        const rowsHtml = data.map(row => `
          <tr>
            <td>${row.category}</td>
            <td>${row.product}</td>
            <td class="text-end">${row.qty}</td>
            <td class="text-end">${formatRupiah(row.selling_price)}</td>
            <td class="text-end">${formatRupiah(row.subtotal)}</td>
            <td>${row.platform}</td>
            <td>${row.nama_toko}</td>
            <td class="text-end text-danger">${formatRupiah(row.diskon)}</td>
            <td class="text-end text-warning">${formatRupiah(row.net_profit)}</td>
            <td class="text-end text-success" data-role="admin">${formatRupiah(row.buying_cost)}</td>
            <td class="text-end text-primary" data-role="admin">
              ${formatRupiah(row.gross_profit)}
            </td>
          </tr>
        `).join("");
  
        tbody.innerHTML = rowsHtml;
  
        // 🔹 Apply role restrictions AFTER table is fully rendered
        applyRoleRestrictions();
      }
  
      // Show modal last
      const modal = new bootstrap.Modal(document.getElementById("detailModal"));
      modal.show();
  
    } catch (err) {
      console.error(err);
    }
  }

async function populateCategoryreport() {

    const select =
        document.getElementById("filterCategory");

    if (!select) return;

    const { data, error } =
        await supabaseClient
            .schema("inventory")
            .from("stock")
            .select("category");

    if (error) {

        alert(error.message);
        return;

    }

    // get unique categories
    categoryreportList =
        [...new Set(
            (data || [])
            .map(d => d.category)
            .filter(Boolean)
        )]
        .sort();

    select.innerHTML =
        `<option value="">All Categories</option>`;

    categoryList.forEach(category => {

        const option =
            document.createElement("option");

        option.value = category;
        option.textContent = category;

        select.appendChild(option);

    });

}
async function downloadSalesExcel() {

    let fromDate =
    document.getElementById("filterStartDate").value;

    let toDate =
        document.getElementById("filterEndDate").value;

    // default to full range if empty
    if (!fromDate)
        fromDate = "1900-01-01";

    if (!toDate)
        toDate = "9999-12-31";

    const roles =
        window.CURRENT_USER_ROLES || [];

    const isAdmin =
        roles.includes("admin");

    // CALL SUPABASE FUNCTION
    const { data, error } =
        await supabaseClient.rpc(
            "sales_report",
            {
                p_from: fromDate,
                p_to: toDate
            }
        );

    if (error) {

        alert(error.message);
        return;

    }

    if (!data || data.length === 0) {

        alert("No data found");
        return;

    }

    // Prepare export data
    const exportData =
        data.map(row => {

            const obj = {

                Date: row.date,
                Transaction_ID: row.transaction_id,
                Customer: row.nama,
                Marketplace: row.marketplace,
                Store: row.nama_toko,
                Courier: row.kurir,
                Category: row.category,
                Product: row.product,
                Qty: row.qty,
                Price: row.price,
                Subtotal: row.subtotal,
                Service_Fee: row.biaya_layanan,
                Diskon: row.diskon,
                Total: row.total

            };

            // Hide Net Profit if not admin
            if (isAdmin) {

                obj.Net_Profit =
                    row.net_profit;
                obj.final_net_profit = row.final_net_profit;

            }

            return obj;

        });

    // Export Excel
    const worksheet =
        XLSX.utils.json_to_sheet(exportData);

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Sales Report"
    );

    XLSX.writeFile(
        workbook,
        `Sales_Report_${fromDate}_${toDate}.xlsx`
    );

}