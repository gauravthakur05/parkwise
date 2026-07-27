/*
  server.js
  ---------------------------------------------------
  Serves frontend files and connects the browser
  with the compiled C++ parking program.
*/

const http = require("http");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;

const isWindows = process.platform === "win32";

// Compiled executable (same folder as server.js)
const PARKING_EXE = path.join(
  __dirname,
  isWindows ? "parking.exe" : "parking"
);

// Frontend files are also in the same folder
const FRONTEND_DIR = __dirname;

function runParkingProgram(args) {
  return new Promise((resolve, reject) => {
    execFile(PARKING_EXE, args, { cwd: __dirname }, (error, stdout, stderr) => {
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
    if (key) result[key.trim()] = value ? value.trim() : "";
  });

  return result;
}

function parseListFormat(line) {
  if (!line) return [];

  return line
    .split("|")
    .filter(Boolean)
    .map((entry) => {
      const obj = {};

      entry.split(",").forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key) obj[key.trim()] = value ? value.trim() : "";
      });

      return obj;
    });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(JSON.stringify(data));
}

function serveStaticFile(req, res) {
  let reqPath = req.url;

  if (reqPath === "/") {
    reqPath = "/index.html";
  }

  const filePath = path.join(FRONTEND_DIR, reqPath);

  const ext = path.extname(filePath);

  const mimeTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {
        "Content-Type": "text/plain",
      });
      return res.end("File not found");
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "text/plain",
    });

    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  try {
    if (pathname === "/api/status" && req.method === "GET") {
      const output = await runParkingProgram(["status"]);
      return sendJSON(res, 200, parseSimpleFormat(output));
    }

    if (pathname === "/api/list" && req.method === "GET") {
      const output = await runParkingProgram(["list"]);
      return sendJSON(res, 200, {
        vehicles: parseListFormat(output),
      });
    }

    if (pathname === "/api/search" && req.method === "GET") {
      const vehicle = parsed.query.vehicleNumber || "";

      const output = await runParkingProgram([
        "search",
        vehicle,
      ]);

      return sendJSON(res, 200, parseSimpleFormat(output));
    }

    if (pathname === "/api/park" && req.method === "POST") {
      let body = "";

      req.on("data", (chunk) => (body += chunk));

      req.on("end", async () => {
        try {
          const data = JSON.parse(body || "{}");

          const output = await runParkingProgram([
            "park",
            data.vehicleNumber,
            data.vehicleType,
          ]);

          sendJSON(res, 200, parseSimpleFormat(output));
        } catch (err) {
          sendJSON(res, 500, {
            FAIL: "SERVER_ERROR",
            MESSAGE: err.toString(),
          });
        }
      });

      return;
    }

    if (pathname === "/api/exit" && req.method === "POST") {
      let body = "";

      req.on("data", (chunk) => (body += chunk));

      req.on("end", async () => {
        try {
          const data = JSON.parse(body || "{}");

          const output = await runParkingProgram([
            "exit",
            data.vehicleNumber,
          ]);

          sendJSON(res, 200, parseSimpleFormat(output));
        } catch (err) {
          sendJSON(res, 500, {
            FAIL: "SERVER_ERROR",
            MESSAGE: err.toString(),
          });
        }
      });

      return;
    }

    serveStaticFile(req, res);

  } catch (err) {
    sendJSON(res, 500, {
      FAIL: "SERVER_ERROR",
      MESSAGE: err.toString(),
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
