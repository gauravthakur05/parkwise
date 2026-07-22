/*
  server.js
  ---------------------------------------------------
  This file does NOT contain any parking logic.
  It only does two simple jobs:

    1. Serves the frontend files (HTML, CSS, JS) so you
       can open the dashboard in your browser.

    2. When the frontend calls an API like /api/park,
       this file RUNS the compiled C++ program
       (backend/parking) with the right arguments,
       reads what it prints, and sends that back to
       the frontend as JSON.

  ALL parking decisions (which slot, fee calculation,
  searching etc.) happen inside the C++ program.
  This file is just a simple messenger between the
  browser and the C++ program.

  Only built-in Node.js modules are used (no npm install needed).
*/

const http = require("http");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = 3000;

// Path to the compiled C++ program (differs on Windows vs Mac/Linux)
const isWindows = process.platform === "win32";
const PARKING_EXE = path.join(
  __dirname,
  "backend",
  isWindows ? "parking.exe" : "parking"
);

// Folder that contains our frontend files
const FRONTEND_DIR = path.join(__dirname, "frontend");

// ---------------------------------------------------------
// Helper: runs the C++ program with given arguments and
// returns its printed output (as a Promise)
// ---------------------------------------------------------
function runParkingProgram(args) {
  return new Promise((resolve, reject) => {
    execFile(PARKING_EXE, args, { cwd: path.join(__dirname, "backend") }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// ---------------------------------------------------------
// Helper: converts the simple "KEY=VALUE;KEY=VALUE" text
// that the C++ program prints into a normal JS object
// ---------------------------------------------------------
function parseSimpleFormat(line) {
  const result = {};
  const parts = line.split(";");
  parts.forEach((part) => {
    const [key, value] = part.split("=");
    if (key) result[key.trim()] = value === undefined ? "" : value.trim();
  });
  return result;
}

// Converts the list output ("SLOT=1,VEHICLE=..|SLOT=2,VEHICLE=..") into an array
function parseListFormat(line) {
  if (!line) return [];
  const entries = line.split("|").filter((e) => e.length > 0);
  return entries.map((entry) => {
    const obj = {};
    entry.split(",").forEach((pair) => {
      const [key, value] = pair.split("=");
      if (key) obj[key.trim()] = value === undefined ? "" : value.trim();
    });
    return obj;
  });
}

// ---------------------------------------------------------
// Helper: sends a JSON response
// ---------------------------------------------------------
function sendJSON(res, statusCode, dataObj) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(dataObj));
}

// ---------------------------------------------------------
// Helper: serves static frontend files (html/css/js)
// ---------------------------------------------------------
function serveStaticFile(req, res) {
  let reqPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(FRONTEND_DIR, reqPath);

  const ext = path.extname(filePath);
  const contentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
    res.end(content);
  });
}

// ---------------------------------------------------------
// Main server: routes each request
// ---------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  try {
    // GET /api/status -> total, available, occupied slots
    if (pathname === "/api/status" && req.method === "GET") {
      const output = await runParkingProgram(["status"]);
      sendJSON(res, 200, parseSimpleFormat(output));
      return;
    }

    // GET /api/list -> all parked vehicles
    if (pathname === "/api/list" && req.method === "GET") {
      const output = await runParkingProgram(["list"]);
      sendJSON(res, 200, { vehicles: parseListFormat(output) });
      return;
    }

    // GET /api/search?vehicleNumber=XYZ
    if (pathname === "/api/search" && req.method === "GET") {
      const vehicleNumber = parsedUrl.query.vehicleNumber || "";
      const output = await runParkingProgram(["search", vehicleNumber]);
      sendJSON(res, 200, parseSimpleFormat(output));
      return;
    }

    // POST /api/park  body: { vehicleNumber, vehicleType }
    if (pathname === "/api/park" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        const data = JSON.parse(body || "{}");
        const output = await runParkingProgram(["park", data.vehicleNumber, data.vehicleType]);
        sendJSON(res, 200, parseSimpleFormat(output));
      });
      return;
    }

    // POST /api/exit  body: { vehicleNumber }
    if (pathname === "/api/exit" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        const data = JSON.parse(body || "{}");
        const output = await runParkingProgram(["exit", data.vehicleNumber]);
        sendJSON(res, 200, parseSimpleFormat(output));
      });
      return;
    }

    // Anything else -> serve frontend files
    serveStaticFile(req, res);
  } catch (err) {
    sendJSON(res, 500, { FAIL: "SERVER_ERROR", MESSAGE: String(err) });
  }
});

server.listen(PORT, () => {
  console.log("=================================================");
  console.log(" Parking Lot Management System is running!");
  console.log(" Open this in your browser: http://localhost:" + PORT);
  console.log("=================================================");
});
