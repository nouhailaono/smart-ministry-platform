// backend/src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const auth = require("../middlewares/auth"); // Note: middlewares (plural)

// All routes require authentication
router.use(auth);

// Admin routes
router.get("/admin/stats", adminController.getStats);

// Director routes
router.get("/director/stats", adminController.getDirectorStats);

// Manager routes
router.get("/manager/stats", adminController.getManagerStats);

// Viewer routes
router.get("/viewer/stats", adminController.getViewerStats);

module.exports = router;