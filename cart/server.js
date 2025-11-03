require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");

const PORT = process.env.PORT || 4003;

app.listen(PORT, () => {
  console.log(`Cart service is running on port ${PORT}`);
});

connectDB();
