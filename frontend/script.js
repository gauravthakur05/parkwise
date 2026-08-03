/*
  script.js
  ---------------------------------------------------
  Plain JavaScript (no frameworks). This file only talks
  to the backend API (served by server.js, which runs the
  C++ program). It does NOT do any parking calculations
  itself - it just sends requests and displays results.
*/

const API_BASE = ""; // same origin, since server.js serves this page too

// ---------- Live clock in header ----------
function updateClock() {
  const now = new Date();
  document.getElementById("liveClock").textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// Small animation: lower the boom barrier pole shortly after load
setTimeout(() => {
  document.getElementById("pole").classList.add("up");
}, 500);

// ---------- Fetch and render status counters ----------
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

// ---------- Fetch and render parked vehicle table + slot map ----------
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

// ---------- Fetch and render full history table ----------
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    const data = await res.json();
    const history = data.history || [];

    const tbody = document.getElementById("historyTableBody");
    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table__empty">No history yet.</td></tr>`;
      return;
    }

    // Show most recent events first
    const reversed = [...history].reverse();

    tbody.innerHTML = reversed
      .map((h) => {
        const isExit = h.EVENT === "EXIT";
        return `
        <tr>
          <td>${isExit ? "🔴 Exit" : "🟢 Entry"}</td>
          <td>#${h.SLOT}</td>
          <td>${h.VEHICLE}</td>
          <td>${h.TYPE}</td>
          <td>${formatEntryTime(h.ENTRY)}</td>
          <td>${isExit ? formatEntryTime(h.EXIT) : "-"}</td>
          <td>${isExit ? `₹${h.FEE}` : "-"}</td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    console.error("Failed to load history", err);
  }
}

// Refresh everything on the dashboard
function refreshDashboard() {
  loadStatus();
  loadVehicles();
  loadHistory();
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
document.getElementById("clearHistoryBtn").addEventListener("click", async () => {
  const confirmed = confirm("This will permanently delete all parking history. Continue?");
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/api/history/clear`, { method: "POST" });
    const data = await res.json();
    if (data.SUCCESS !== undefined) {
      loadHistory();
    } else {
      alert("Could not clear history.");
    }
  } catch (err) {
    alert("Server error. Is server.js running?");
  }
});
document.getElementById("refreshBtn").addEventListener("click", refreshDashboard);

// ---------- Load data when page opens ----------
refreshDashboard();
