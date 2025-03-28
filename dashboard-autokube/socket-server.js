const { Server } = require("socket.io");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

let io = null;

// Track running processes per cluster
const runningProcesses = {}; // { [clusterId]: { py, ansible } }

function initializeSocket(server) {
  if (io) return io;

  io = new Server(server, {
    path: "/api/socket",
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("✅ Client connected");

    // Join socket room based on cluster
    socket.on("request-logs", (clusterId) => {
      const logFilePath = path.resolve(__dirname, `../logs/deploy-${clusterId}.log`);
      if (fs.existsSync(logFilePath)) {
        const logs = fs.readFileSync(logFilePath, "utf8").split("\n").filter(Boolean);
        logs.forEach((line) => socket.emit("log", line));
      }

      socket.join(clusterId); // Join room to receive real-time logs

      // If process is running, reattach logs
      const running = runningProcesses[clusterId];
      if (running?.py) {
        socket.emit("log", "📡 Re-attached to running Python script...");
        running.py.stdout.on("data", (data) => {
          io.to(clusterId).emit("log", `[python] ${data.toString()}`);
        });
        running.py.stderr.on("data", (data) => {
          io.to(clusterId).emit("log", `[python stderr] ${data.toString()}`);
        });
      }

      if (running?.ansible) {
        socket.emit("log", "📡 Re-attached to running Ansible...");
        running.ansible.stdout.on("data", (data) => {
          io.to(clusterId).emit("log", `[ansible] ${data.toString()}`);
        });
        running.ansible.stderr.on("data", (data) => {
          io.to(clusterId).emit("log", `[ansible stderr] ${data.toString()}`);
        });
      }
    });

    // When run-script is triggered
    socket.on("run-script", (clusterId) => {
      if (!clusterId) return;

      const logFilePath = path.resolve(__dirname, `../logs/deploy-${clusterId}.log`);
      const logAndEmit = (msg) => {
        const clean = msg.toString().replace(/\r?\n$/, "");
        fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
        fs.appendFileSync(logFilePath, clean + "\n");
        io.to(clusterId).emit("log", clean);
      };

      logAndEmit("📦 Starting deployment...");

      const basePath = path.resolve(__dirname, "../scripts/kubespray");
      const venvPath = path.join(basePath, "venv");
      const requirementsPath = path.join(basePath, "requirements.txt");

      const emit = (prefix) => (data) => logAndEmit(`[${prefix}] ${data}`);

      if (!fs.existsSync(venvPath)) {
        logAndEmit("📦 Creating virtual environment...");

        const venv = spawn("python3", ["-m", "venv", venvPath]);

        venv.stdout.on("data", emit("venv"));
        venv.stderr.on("data", emit("venv stderr"));

        venv.on("close", (code) => {
          if (code !== 0) {
            logAndEmit(`❌ Failed to create venv (code ${code})`);
            return;
          }
          installDeps();
        });
      } else {
        logAndEmit("✅ Virtual environment exists.");
        installDeps();
      }

      function installDeps() {
        const pip = spawn(path.join(venvPath, "bin/pip"), ["install", "-r", requirementsPath]);

        pip.stdout.on("data", emit("pip"));
        pip.stderr.on("data", emit("pip stderr"));

        pip.on("close", (code) => {
          if (code !== 0) {
            logAndEmit(`❌ Pip install failed (code ${code})`);
            return;
          }
          logAndEmit("📦 Dependencies installed.");
          runPython();
        });
      }

      function runPython() {
        const pyScript = path.resolve(__dirname, "../scripts/myscript.py");
        const py = spawn("python3", [pyScript]);

        runningProcesses[clusterId] = { py, ansible: null };

        py.stdout.on("data", emit("python"));
        py.stderr.on("data", emit("python stderr"));

        py.on("close", (code) => {
          logAndEmit(`🐍 Python script finished (code ${code})`);
          runAnsible();
        });
      }

      function runAnsible() {
        const ansible = spawn("ansible-playbook", [
          "-i",
          path.join(basePath, "inventory/mycluster/"),
          path.join(basePath, "cluster.yml"),
          "-b",
          "-v",
        ]);

        runningProcesses[clusterId].ansible = ansible;

        ansible.stdout.on("data", emit("ansible"));
        ansible.stderr.on("data", emit("ansible stderr"));

        ansible.on("close", (code) => {
          logAndEmit(`✅ Ansible finished (code ${code})`);
          delete runningProcesses[clusterId]; // Cleanup
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected");
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
    
    
  });

  return io;
}

module.exports = { initializeSocket };
