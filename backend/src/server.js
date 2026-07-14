// backend/src/server.js
const dotenv = require("dotenv");
const app = require("./app");

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("🏛️  Smart Ministry Platform - Backend Server");
  console.log("=".repeat(60));
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API Docs: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI Service: ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}`);
  console.log("=".repeat(60));
  console.log("✅ Server is ready to accept requests");
  console.log("=".repeat(60));
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});