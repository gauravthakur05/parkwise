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

// Compiled executable in project root
const PARKING_EXE = path.join(__dirname, isWindows ? "parking.exe" : "parking");

// Frontend files are in project root
const FRONTEND_DIR = __dirname;

function runParkingProgram(args) {
  return new Promise((resolve, reject) => {
    execFile(PARKING_EXE, args, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        return reject(stderr || error.message);
      }
      resolve(stdout.trim());
    });
  });
}

function parseSimpleFormat(line) {
  const result = {};
  line.split(";").forEach(part => {
    const [k,v] = part.split("=");
    if (k) result[k.trim()] = v ? v.trim() : "";
  });
  return result;
}

function parseListFormat(line) {
  if (!line) return [];
  return line.split("|").filter(Boolean).map(entry => {
    const obj = {};
    entry.split(",").forEach(pair => {
      const [k,v] = pair.split("=");
      if (k) obj[k.trim()] = v ? v.trim() : "";
    });
    return obj;
  });
}

function sendJSON(res,status,data){
  res.writeHead(status,{
    "Content-Type":"application/json",
    "Access-Control-Allow-Origin":"*"
  });
  res.end(JSON.stringify(data));
}

function serveStaticFile(req,res){
  const reqPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(FRONTEND_DIR, reqPath);

  const mime={
    ".html":"text/html",
    ".css":"text/css",
    ".js":"application/javascript"
  };

  fs.readFile(filePath,(err,data)=>{
    if(err){
      res.writeHead(404,{"Content-Type":"text/plain"});
      return res.end("File not found");
    }
    res.writeHead(200,{"Content-Type":mime[path.extname(filePath)]||"text/plain"});
    res.end(data);
  });
}

const server=http.createServer(async(req,res)=>{
  const parsed=url.parse(req.url,true);
  const pathname=parsed.pathname;

  try{
    if(pathname==="/api/status" && req.method==="GET"){
      return sendJSON(res,200,parseSimpleFormat(await runParkingProgram(["status"])));
    }

    if(pathname==="/api/list" && req.method==="GET"){
      return sendJSON(res,200,{vehicles:parseListFormat(await runParkingProgram(["list"]))});
    }

    if(pathname==="/api/search" && req.method==="GET"){
      return sendJSON(res,200,parseSimpleFormat(await runParkingProgram(["search",parsed.query.vehicleNumber||""])));
    }

    if((pathname==="/api/park" || pathname==="/api/exit") && req.method==="POST"){
      let body="";
      req.on("data",c=>body+=c);
      req.on("end",async()=>{
        try{
          const data=JSON.parse(body||"{}");
          const args=pathname==="/api/park"
            ?["park",data.vehicleNumber,data.vehicleType]
            :["exit",data.vehicleNumber];
          sendJSON(res,200,parseSimpleFormat(await runParkingProgram(args)));
        }catch(e){
          sendJSON(res,500,{FAIL:"SERVER_ERROR",MESSAGE:String(e)});
        }
      });
      return;
    }

    serveStaticFile(req,res);
  }catch(e){
    sendJSON(res,500,{FAIL:"SERVER_ERROR",MESSAGE:String(e)});
  }
});

server.listen(PORT,()=>console.log(`Server running on ${PORT}`));
