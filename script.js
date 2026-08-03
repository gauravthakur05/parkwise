

const API_BASE = ""; 
function updateClock() {
  const now = new Date();
  document.getElementById("liveClock").textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();


setTimeout(() => {
  document.getElementById("pole").classList.add("up");
}, 500);


async function loadStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    const data = await res.json();
    document.getElementById("totalSlots").textContent = data.TOTAL ?? "--";
    document.getElementById("availableSlots").textContent = data.AVAILABLE ?? "--";
    document.getElementById("occupiedSlots").textContent = data.OCCUPIED ?? "--";
  } catch (err) {
    console.error("Failed to load status", err);
  }
}

async function loadVehicles() {
  try {
    const res = await fetch(`${API_BASE}/api/list`);
    const data = await res.json();
    const vehicles = data.vehicles || [];

    const tbody = document.getElementById("vehicleTableBody");
    if (vehicles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="table__empty">No vehicles parked yet.</td></tr>`;
    } else {
      tbody.innerHTML = vehicles
        .map(
          (v) => `
        <tr>
          <td>#${v.SLOT}</td>
          <td>${v.VEHICLE}</td>
          <td>${v.TYPE}</td>
          <td>${formatEntryTime(v.ENTRY)}</td>
        </tr>`
        )
        .join("");
    }

    renderSlotMap(vehicles);
  } catch (err) {
    console.error("Failed to load vehicle list", err);
  }
}

// Convert unix timestamp (seconds) from C++ into readable time
function formatEntryTime(unixSeconds) {
  if (!unixSeconds) return "-";
  const date = new Date(parseInt(unixSeconds, 10) * 1000);
  return date.toLocaleTimeString();
}

// Draw a simple visual grid of all slots (occupied vs free)
function renderSlotMap(vehicles) {
  const totalSlots = parseInt(document.getElementById("totalSlots").textContent, 10) || 10;
  const occupiedSlotNumbers = vehicles.map((v) => parseInt(v.SLOT, 10));

  const slotMap = document.getElementById("slotMap");
  let html = "";
  for (let i = 1; i <= totalSlots; i++) {
    const isOccupied = occupiedSlotNumbers.includes(i);
    html += `<div class="slot-bay ${isOccupied ? "occupied" : "free"}">${i}</div>`;
  }
  slotMap.innerHTML = html;
}

// Refresh everything on the dashboard
function refreshDashboard() {
  loadStatus();
  loadVehicles();
}

// ---------- Park a vehicle ----------
document.getElementById("parkForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const vehicleNumber = document.getElementById("vehicleNumberIn").value.trim();
  const vehicleType = document.getElementById("vehicleTypeIn").value;
  const resultEl = document.getElementById("parkResult");

  try {
    const res = await fetch(`${API_BASE}/api/park`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleNumber, vehicleType }),
    });
    const data = await res.json();

    if (data.SUCCESS !== undefined) {
      resultEl.textContent = `Parked in Bay ${data.SLOT} ✔`;
      resultEl.className = "form__result ok";
      document.getElementById("vehicleNumberIn").value = "";
      refreshDashboard();
    } else {
      resultEl.textContent = data.MESSAGE || "Could not park vehicle";
      resultEl.className = "form__result err";
    }
  } catch (err) {
    resultEl.textContent = "Server error. Is server.js running?";
    resultEl.className = "form__result err";
  }
});

// ---------- Exit a vehicle ----------
document.getElementById("exitForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const vehicleNumber = document.getElementById("vehicleNumberOut").value.trim();
  const feeCard = document.getElementById("feeCard");

  try {
    const res = await fetch(`${API_BASE}/api/exit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleNumber }),
    });
    const data = await res.json();

    if (data.SUCCESS !== undefined) {
      feeCard.hidden = false;
      document.getElementById("feeValue").textContent = `₹${data.FEE}`;
      document.getElementById("feeMeta").textContent =
        `Bay ${data.SLOT} • ${data.TYPE} • parked for ${data.DURATION} min`;
      document.getElementById("vehicleNumberOut").value = "";
      refreshDashboard();
    } else {
      feeCard.hidden = true;
      alert(data.MESSAGE || "Vehicle not found");
    }
  } catch (err) {
    alert("Server error. Is server.js running?");
  }
});

// ---------- Search a vehicle ----------
document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const vehicleNumber = document.getElementById("searchInput").value.trim();
  const resultEl = document.getElementById("searchResult");

  try {
    const res = await fetch(`${API_BASE}/api/search?vehicleNumber=${encodeURIComponent(vehicleNumber)}`);
    const data = await res.json();

    if (data.SUCCESS !== undefined) {
      resultEl.textContent = `Found in Bay ${data.SLOT} (${data.TYPE})`;
      resultEl.className = "form__result ok";
    } else {
      resultEl.textContent = data.MESSAGE || "Vehicle not found";
      resultEl.className = "form__result err";
    }
  } catch (err) {
    resultEl.textContent = "Server error. Is server.js running?";
    resultEl.className = "form__result err";
  }
});

// ---------- Refresh button ----------
document.getElementById("refreshBtn").addEventListener("click", refreshDashboard);

// ---------- Load data when page opens ----------
refreshDashboard();
