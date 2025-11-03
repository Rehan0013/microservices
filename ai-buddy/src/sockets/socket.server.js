const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const agent = require("../agent/agent");
const redis = require("../db/redis");

async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: "/api/socket/socket.io/",
  });

  io.use(async (socket, next) => {
    const cookies = socket.handshake.headers?.cookie;

    const { token } = cookies ? cookie.parse(cookies) : {};

    if (!token) {
      return next(new Error("Token not provided"));
    }

    try {
      // First, check if token is blacklisted in Redis
      const isBlacklisted = await redis.get(`blacklist:${token}`);

      if (isBlacklisted) {
        // Clear the invalid cookie
        res.clearCookie("token", {
          httpOnly: true,
          secure: true,
        });
        return res
          .status(401)
          .json({ message: "Unauthorized - token has been invalidated" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = decoded;
      socket.token = token;

      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(socket.user, socket.token);

    socket.on("message", async (data) => {
      const agentResponse = await agent.invoke(
        {
          messages: [
            {
              role: "user",
              content: data,
            },
          ],
        },
        {
          metadata: {
            token: socket.token,
          },
        }
      );

      const lastMessage =
        agentResponse.messages[agentResponse.messages.length - 1];

      socket.emit("message", lastMessage.content);
    });
  });
}

module.exports = { initSocketServer };
