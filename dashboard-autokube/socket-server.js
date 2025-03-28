const { Server } = require("socket.io");
const { spawn } = require("child_process");

let io = null;

function initializeSocket(server) {
  if (io) return io;

  io = new Server(server, {
    path: "/api/socket",
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("✅ Client connected");

    socket.on("run-script", () => {
      const py = spawn("python3", ["./src/scripts/myscript.py"]);

      py.stdout.on("data", (data) => {
        socket.emit("log", data.toString());
      });

      py.stderr.on("data", (data) => {
        socket.emit("log", `[stderr] ${data.toString()}`);
      });

      py.on("close", (code) => {
        socket.emit("log", `✅ Script finished with code ${code}`);
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected");
    });
  });

  return io;
}

module.exports = { initializeSocket };
