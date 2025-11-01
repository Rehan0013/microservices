const jwt = require("jsonwebtoken");
const redis = require("../db/redis");

function createAuthMiddleware(roles = ["user"]) {
  return async function authMiddleware(req, res, next) {
    const token =
      req.cookies?.token || req.headers?.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: No token provided",
      });
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

      if (!roles.includes(decoded.role)) {
        return res.status(403).json({
          message: "Forbidden: Insufficient permissions",
        });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        message: "Unauthorized: Invalid token",
      });
    }
  };
}

module.exports = createAuthMiddleware;
