// ========================================
// LOAD STORES
// ========================================

async function loadStores() {

    const { data, error } = await supabaseClient
      .from("master_stores")
      .select("*")
      .order("id", { ascending: true });
  
    if (error) {
      console.error("Load stores error:", error);
      return;
    }
  
    const tbody = document.getElementById("storeTable");
    tbody.innerHTML = "";
  
    if (!data || data.length === 0) {
  
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted">
            No store found
          </td>
        </tr>
      `;
  
      return;
    }
  
    data.forEach((store, index) => {

        tbody.innerHTML += `
          <tr>
      
            <td>${index + 1}</td>
      
            <td>${store.store_name}</td>
      
            <td>
      
              <button class="btn btn-sm btn-warning"
                onclick="editStore('${store.id}','${store.store_name}')">
                Edit
              </button>
      
              <button class="btn btn-sm btn-danger"
                onclick="deleteStore('${store.id}')">
                Delete
              </button>
      
            </td>
      
          </tr>
        `;
      
      });
  
  }

  function addStore() {

    document.getElementById("storeModalTitle").innerText = "Add Store";
  
    document.getElementById("store_id").value = "";
    document.getElementById("store_name").value = "";
  
    const modal = new bootstrap.Modal(
      document.getElementById("storeModal")
    );
  
    modal.show();
  
  }

  function editStore(id, name) {

    document.getElementById("storeModalTitle").innerText = "Edit Store";
  
    document.getElementById("store_id").value = id;
    document.getElementById("store_name").value = name;
  
    const modal = new bootstrap.Modal(
      document.getElementById("storeModal")
    );
  
    modal.show();
  
  }

  document.addEventListener("submit", async function(e){

    if(e.target.id !== "storeForm") return;
  
    e.preventDefault();
  
    const id = document.getElementById("store_id").value;
    const store_name = document.getElementById("store_name").value;
  
    // UPDATE
    if (id) {
  
      const { error } = await supabaseClient
        .from("master_stores")
        .update({ store_name })
        .eq("id", id);
  
      if (error) {
        console.error("Update error:", error);
        alert("Update failed");
        return;
      }
  
    }
  
    // INSERT
    else {
  
      const { error } = await supabaseClient
        .from("master_stores")
        .insert([{ store_name }]);
  
      if (error) {
        console.error("Insert error:", error);
        alert("Insert failed");
        return;
      }
  
    }
  
    bootstrap.Modal
      .getInstance(document.getElementById("storeModal"))
      .hide();
  
    loadStores();
  
  });

async function deleteStore(id){

    if(!confirm("Delete this store?")) return;
  
    const { error } = await supabaseClient
      .from("master_stores")
      .delete()
      .eq("id", id);
  
    if(error){
      console.error("Delete error:", error);
      alert("Delete failed");
      return;
    }
  
    loadStores();
  
  }

  document.addEventListener("DOMContentLoaded", () => {

    loadStores();
  
  });