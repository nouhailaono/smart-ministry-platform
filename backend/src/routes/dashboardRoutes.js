const express = require("express");
const router = express.Router();

const { getStats } = require("../controllers/dashboardController");
const verifyToken = require("../middlewares/authMiddleware");

// Dashboard stats
router.get("/stats", verifyToken, getStats);

module.exports = router;