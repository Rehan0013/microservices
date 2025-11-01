const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const redis = require("../db/redis"); // adjust path to your redis file

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized - no token" });
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

    // Then verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await userModel.findById(decoded.id);

    if (!user) {
      // Clear the invalid cookie
      res.clearCookie("token", {
        httpOnly: true,
        secure: true,
      });
      return res.status(401).json({ message: "Unauthorized - user not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    // Clear the invalid cookie on any error
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
    });

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized - token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Unauthorized - invalid token" });
    } else {
      return res
        .status(401)
        .json({ message: "Unauthorized - authentication failed" });
    }
  }
};

module.exports = { authMiddleware };
