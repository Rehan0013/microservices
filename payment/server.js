require("dotenv").config();
const app = require("./src/app");

const connectDB = require("./src/db/db");

const PORT = process.env.PORT || 4006;

app.listen(PORT, () => {
  console.log(`Payment service listening on port ${PORT}`);
});

connectDB();
