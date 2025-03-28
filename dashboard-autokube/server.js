// server.js
const next = require("next");
const express = require("express");
const http = require("http");
const { initializeSocket } = require("./socket-server");

const port = 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);

  initializeSocket(server); // 👈 Attach WebSocket logic

  expressApp.all("*", (req, res) => handle(req, res));

  server.listen(port, () => {
    console.log(`🚀 Server ready on http://localhost:${port}`);
  });
});
