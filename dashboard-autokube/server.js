const express = require("express");
const next = require("next");
const http = require("http");
const { initializeSocket } = require("./socket-server");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);

  initializeSocket(server);

  expressApp.all("*", (req, res) => handle(req, res));

  server.listen(3000, '0.0.0.0', () => {
    console.log("🚀 Server running at http://localhost:3000");
  });
});
