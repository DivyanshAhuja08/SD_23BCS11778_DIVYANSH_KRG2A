require("dotenv").config();

const express = require("express");
const cors = require("cors");
const urlRoutes = require("./routes/urlRoutes");
const { connectPostgres, initDatabase } = require("./config/db");
const { connectRedis } = require("./config/redis");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(urlRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const startServer = async () => {
  try {
    await connectPostgres();
    await initDatabase();
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
