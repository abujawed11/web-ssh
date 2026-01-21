const http = require("http");
const app = require("./app");
const setupWebSocket = require("./websocket");

const server = http.createServer(app);
setupWebSocket(server);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`ssh-back listening on http://localhost:${PORT}`);
});