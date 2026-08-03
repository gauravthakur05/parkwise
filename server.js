

const http = require("http");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = 3000;


const isWindows = process.platform === "win32";
const PARKING_EXE = path.join(
  __dirname,
  "backend",
  isWindows ? "parking.exe" : "parking"
);


const FRONTEND_DIR = path.join(__dirname, "frontend");


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


function parseSimpleFormat(line) {
  const result = {};
  const parts = line.split(";");
  parts.forEach((part) => {
    const [key, value] = part.split("=");
    if (key) result[key.trim()] = value === undefined ? "" : value.trim();
  });
  return result;
}


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


function historyToCSV(records) {
  const headers = ["Event", "Slot", "Vehicle Number", "Vehicle Type", "Entry Time", "Exit Time", "Fee (Rs)"];
  const rows = [headers.join(",")];

  records.forEach((r) => {
    const entry = r.ENTRY && r.ENTRY !== "0" ? new Date(parseInt(r.ENTRY, 10) * 1000).toLocaleString() : "";
    const exit = r.EXIT && r.EXIT !== "0" ? new Date(parseInt(r.EXIT, 10) * 1000).toLocaleString() : "";
    const row = [r.EVENT, r.SLOT, r.VEHICLE, r.TYPE, entry, exit, r.FEE];
    // wrap each value in quotes so commas inside dates don't break the CSV
    rows.push(row.map((v) => `"${v ?? ""}"`).join(","));
  });

  return rows.join("\r\n");
}


function sendJSON(res, statusCode, dataObj) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(dataObj));
}


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

    // GET /api/history -> full ENTRY/EXIT log as JSON
    if (pathname === "/api/history" && req.method === "GET") {
      const output = await runParkingProgram(["history"]);
      sendJSON(res, 200, { history: parseListFormat(output) });
      return;
    }

    // GET /api/history/download -> full log as a downloadable CSV (opens in Excel)
    if (pathname === "/api/history/download" && req.method === "GET") {
      const output = await runParkingProgram(["history"]);
      const records = parseListFormat(output);
      const csv = historyToCSV(records);

      res.writeHead(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="parking_history.csv"',
        "Access-Control-Allow-Origin": "*",
      });
      res.end(csv);
      return;
    }

    // POST /api/history/clear -> wipes the history log
    if (pathname === "/api/history/clear" && req.method === "POST") {
      const output = await runParkingProgram(["clearhistory"]);
      sendJSON(res, 200, parseSimpleFormat(output));
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
