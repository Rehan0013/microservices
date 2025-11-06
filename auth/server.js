require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");

const { connect } = require("./src/broker/broker");

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

connectDB();

connect();
