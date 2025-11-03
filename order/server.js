require("dotenv").config();
const app = require("./src/app");

const connectDB = require("./src/db/db");

const PORT = process.env.PORT || 4004;

app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});

connectDB();