# 🅿️ ParkWise — Parking Lot Management System

A Parking Lot Management System with beginner-friendly C++ logic (arrays, classes, file handling) powering slot allocation, vehicle search, and fee calculation, connected to a clean HTML/CSS/JS dashboard via a lightweight Node.js bridge. Built for learning core DSA/OOP concepts with a real working frontend.

---

## ✨ Features

- 🚗 Park a vehicle (auto-assigns the first free slot)
- 🚪 Exit a vehicle (auto-calculates parking fee)
- 📊 Live dashboard — total / available / occupied slots
- 🔍 Search a vehicle by number
- 📋 Table + visual bay map of currently parked vehicles
- 💰 Duration-based fee calculation (Bike / Car / Truck rates)

---

## 🛠️ Tech Stack

| Layer            | Technology                          |
|-------------------|--------------------------------------|
| Core logic        | C++ (arrays, classes, file I/O)     |
| Bridge server      | Node.js (built-in `http` module only, no npm packages) |
| Frontend           | HTML, CSS, vanilla JavaScript       |
| Data storage       | Plain text file (`data/parking_data.txt`) |

No frameworks. No database. No external libraries — everything is intentionally simple and beginner-friendly.

---

## 🏗️ Architecture

```
 Browser (HTML/CSS/JS)
        |  fetch("/api/park", ...)
        v
 server.js  (Node.js bridge — no logic, just a messenger)
        |  spawns: ./backend/parking park PB10AB1234 Car
        v
 backend/parking  (compiled C++ program — all the logic)
        |  reads/writes
        v
 data/parking_data.txt   (simple text file as storage)
```

All parking decisions — finding a free slot, searching vehicles, calculating fees — happen inside the C++ program. `server.js` only runs the compiled binary and relays its output to the browser as JSON.

---

## 📁 Folder Structure

```
ParkingLotSystem/
├── backend/
│   └── parking.cpp        # All parking logic (C++)
├── data/
│   └── parking_data.txt   # Auto-created data store
├── frontend/
│   ├── index.html         # Dashboard page
│   ├── style.css          # Styling
│   └── script.js          # Calls the API
├── server.js              # Node.js bridge
└── README.md
```

---

## ⚙️ Requirements

- **g++** (C++ compiler) — check with `g++ --version`
- **Node.js** (v14+) — check with `node --version`

---

## 🚀 Getting Started

**1. Clone the repo**
```bash
git clone https://github.com/<your-username>/parking-lot-management-system.git
cd parking-lot-management-system
```

**2. Compile the C++ backend**
```bash
cd backend
g++ -o parking parking.cpp        # macOS/Linux
g++ -o parking.exe parking.cpp    # Windows
cd ..
```

**3. Start the server**
```bash
node server.js
```

**4. Open the dashboard**

Go to [http://localhost:3000](http://localhost:3000) in your browser.

> ⚠️ Don't open `frontend/index.html` directly or via a Live Preview/Live Server extension — the dashboard needs `server.js` running to talk to the C++ backend.

---

## 💡 How It Works

- Fee calculation: ₹10/hr (Bike), ₹20/hr (Car), ₹40/hr (Truck), minimum 1 hour charge.
- Slot allocation and vehicle search use simple **linear search** over a fixed-size array.
- Data persists across restarts using basic `ifstream`/`ofstream` file handling.
- Lot size is configurable via the `TOTAL_SLOTS` constant in `parking.cpp`.

---

## 📸 Preview

*(Add a screenshot of your dashboard here)*

---

## 📄 License

This project is open source and available for learning and portfolio use.
