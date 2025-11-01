const express = require("express");
const cookiesParser = require("cookie-parser");

// rourte
const productRoute = require("./routes/product.route");

const app = express();
app.use(express.json());
app.use(cookiesParser());

app.use("/api/product", productRoute)

module.exports = app;
