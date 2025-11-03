const express = require("express");
const cookieParser = require("cookie-parser");

const cartRoute = require("./routes/cart.route");

const app = express();
app.use(express.json());
app.use(cookieParser());

// health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Cart service is healthy",
  });
});

app.use("/cart", cartRoute);

module.exports = app;
