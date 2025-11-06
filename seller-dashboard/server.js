require("dotenv").config();
const app = require("./src/app");

const connectDB = require("./src/db/db");
const listener = require("./src/broker/listener");
const { connect } = require("./src/broker/broker");

const PORT = process.env.PORT || 4009;

app.listen(PORT, () => {
  console.log("Seller server is running on port " + PORT);
});

connectDB();

connect().then(() => {
  listener();
});
