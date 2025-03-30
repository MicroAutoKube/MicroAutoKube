const { Server } = require("socket.io");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

let io = null;

// Track running processes per cluster
const runningProcesses = {}; // { [clusterId]: { py, ansible } }

require("dotenv").config({ path: path.resolve(__dirname, "../dashboard-autokube/.env") });


function initializeSocket(server) {
  if (io) return io;

  io = new Server(server, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXTAUTH_URL,
      methods: ["GET","POST"]
    }
  });
  

  function logAndEmit(clusterId, msg) {
    const clean = msg.toString().replace(/\r?\n$/, "");
    const logFilePath = path.resolve(__dirname, `../logs/deploy-${clusterId}.log`);
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    fs.appendFileSync(logFilePath, clean + "\n");
    io.to(clusterId).emit("log", clean);
  }

  function attachProcessListeners(clusterId, proc, prefix) {
    if (proc.__listenersAttached) return;

    proc.stdout.on("data", (data) => {
      logAndEmit(clusterId, `[${prefix}] ${data}`);
    });

    proc.stderr.on("data", (data) => {
      logAndEmit(clusterId, `[${prefix} stderr] ${data}`);
    });

    proc.__listenersAttached = true;
  }

  io.on("connection", (socket) => {
    console.log("✅ Client connected");

    socket.on("request-logs", (clusterId) => {
      const logFilePath = path.resolve(__dirname, `../logs/deploy-${clusterId}.log`);
      if (fs.existsSync(logFilePath)) {
        const logs = fs.readFileSync(logFilePath, "utf8").split("\n").filter(Boolean);
        logs.forEach((line) => socket.emit("log", line));
      }

      socket.join(clusterId);

      const running = runningProcesses[clusterId];
      if (running?.py) {
        socket.emit("log", "📡 Re-attached to running Python script...");
      }
      if (running?.ansible) {
        socket.emit("log", "📡 Re-attached to running Ansible...");
      }
    });

    socket.on("run-script", (clusterId) => {
      if (!clusterId) return;

      // Prevent duplicate runs for the same cluster
      if (runningProcesses[clusterId]) {
        socket.emit("log", `⚠️ Deployment already running for cluster ${clusterId}`);
        return;
      }

      logAndEmit(clusterId, "📦 Starting deployment...");

      const basePath = path.resolve(__dirname, "../scripts");
      const venvPath = path.join(basePath, "venv");
      const requirementsPath = path.join(basePath, "kubespray/requirements.txt");

      if (!fs.existsSync(venvPath)) {
        logAndEmit(clusterId, "📦 Creating virtual environment...");

        const venv = spawn("python3", ["-m", "venv", venvPath]);
        attachProcessListeners(clusterId, venv, "venv");

        venv.on("close", (code) => {
          if (code !== 0) {
            logAndEmit(clusterId, `❌ Failed to create venv (code ${code})`);
            return;
          }
          installDeps();
        });
      } else {
        logAndEmit(clusterId, "✅ Virtual environment exists.");
        installDeps();
      }

      function installDeps() {
        const pip = spawn(path.join(venvPath, "bin/pip"), ["install", "-r", requirementsPath]);
        attachProcessListeners(clusterId, pip, "pip");

        pip.on("close", (code) => {
          if (code !== 0) {
            logAndEmit(clusterId, `❌ Pip install failed (code ${code})`);
            return;
          }
          logAndEmit(clusterId, "📦 Dependencies installed.");
          runPython();
        });
      }

      function runPython() {
        const pyScript = path.resolve(__dirname, "../scripts/myscript.py");
        const nextAuthUrl = process.env.NEXTAUTH_URL;
        const pythonPath = path.join(venvPath, "bin/python"); // use venv python
      
        const py = spawn(pythonPath, [pyScript, nextAuthUrl, clusterId]);
      
        runningProcesses[clusterId] = { py, ansible: null };
        attachProcessListeners(clusterId, py, "python");
      
        py.on("close", (code) => {
          logAndEmit(clusterId, `🐍 Python script finished (code ${code})`);
          runAnsible();
        });
      }
      
      

      function runAnsible() {
        const ansible = spawn("ansible-playbook", [
          "-i",
          path.join(basePath, "kubespray/inventory/mycluster/"),
          path.join(basePath, "kubespray/cluster.yml"),
          "-b",
          "-v",
        ]);

        runningProcesses[clusterId].ansible = ansible;
        attachProcessListeners(clusterId, ansible, "ansible");

        ansible.on("close", (code) => {
          logAndEmit(clusterId, `✅ Ansible finished (code ${code})`);
          delete runningProcesses[clusterId];
        });
      }
    });

    socket.on("kill-script", (clusterId) => {
      const processes = runningProcesses[clusterId];
      if (!processes) {
        socket.emit("log", `⚠️ No running script for cluster ${clusterId}`);
        return;
      }

      if (processes.py) {
        processes.py.kill();
        socket.emit("log", `🛑 Python script killed`);
      }

      if (processes.ansible) {
        processes.ansible.kill();
        socket.emit("log", `🛑 Ansible process killed`);
      }

      delete runningProcesses[clusterId];
    });

    socket.on("clear-logs", (clusterId) => {
      const logFilePath = path.resolve(__dirname, `../logs/deploy-${clusterId}.log`);
      try {
        if (fs.existsSync(logFilePath)) {
          fs.unlinkSync(logFilePath);
          socket.emit("log", `🧹 Logs cleared for cluster ${clusterId}`);
        } else {
          socket.emit("log", `⚠️ No logs to clear for cluster ${clusterId}`);
        }
      } catch (err) {
        socket.emit("log", `❌ Failed to clear logs: ${err.message}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected");
    });
  });

  return io;
}

module.exports = { initializeSocket };
