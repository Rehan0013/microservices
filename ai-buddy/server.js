require("dotenv").config();
const app = require("./src/app");
const http = require("http");

const PORT = process.env.PORT || 4007;

const { initSocketServer } = require("./src/sockets/socket.server");

const httpServer = http.createServer(app);

initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`AI Buddy service is running on port ${PORT}`);
});
